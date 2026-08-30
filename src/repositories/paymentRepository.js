'use strict';

const { getPool } = require('../config/database');
function db(connection) { return connection || getPool(); }

async function listPaymentMethods() {
  const [rows] = await getPool().query(`
    SELECT id, code, name, requires_cash_session, creates_receivable, is_active, sort_order
      FROM payment_methods
     WHERE is_active = 1
     ORDER BY sort_order, name, id
  `);
  return rows;
}
async function findPaymentMethodById(id, connection = null) {
  const [rows] = await db(connection).execute('SELECT id, code, name, requires_cash_session, creates_receivable, is_active FROM payment_methods WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}
async function findSaleForUpdate(id, connection) {
  const [rows] = await connection.execute("SELECT s.*, DATE_FORMAT(COALESCE(s.sold_at, s.created_at), '%Y-%m-%d') AS sale_date FROM sales s WHERE s.id = ? FOR UPDATE", [id]);
  return rows[0] || null;
}
async function findSaleById(id, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT s.*, DATE_FORMAT(COALESCE(s.sold_at, s.created_at), '%Y-%m-%d') AS sale_date, c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ? LIMIT 1
  `, [id]);
  return rows[0] || null;
}
async function findBatchByOperationKey(operationKey, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM sale_payment_batches WHERE operation_key = ? LIMIT 1', [operationKey]);
  if (!rows[0]) return null;
  const batch = rows[0];
  batch.allocations = await listBatchAllocations(batch.id, connection);
  return batch;
}
async function createPaymentBatch(data, actorId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO sale_payment_batches (sale_id, cash_session_id, created_by_user_id, operation_key, status)
    VALUES (?, ?, ?, ?, 'CONFIRMED')
  `, [data.saleId, data.cashSessionId, actorId, data.operationKey]);
  return result.insertId;
}
async function createSalePaymentAllocation(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO sale_payment_allocations (sale_id, payment_batch_id, payment_method_id, amount, installments, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [data.saleId, data.paymentBatchId, data.paymentMethodId, data.amount, data.installments, data.notes]);
  return result.insertId;
}
async function sumConfirmedAllocations(saleId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT COALESCE(SUM(spa.amount), 0.00) AS allocated_amount
      FROM sale_payment_allocations spa
      LEFT JOIN sale_payment_batches spb ON spb.id = spa.payment_batch_id
     WHERE spa.sale_id = ?
       AND (spa.payment_batch_id IS NULL OR spb.status = 'CONFIRMED')
  `, [saleId]);
  return String(rows[0].allocated_amount);
}
async function listBatchAllocations(batchId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT spa.id, spa.sale_id, spa.payment_batch_id, spa.payment_method_id, spa.amount, spa.installments, spa.notes,
           pm.code AS payment_method_code, pm.name AS payment_method_name, pm.requires_cash_session, pm.creates_receivable
      FROM sale_payment_allocations spa
      JOIN payment_methods pm ON pm.id = spa.payment_method_id
     WHERE spa.payment_batch_id = ?
     ORDER BY spa.id
  `, [batchId]);
  return rows;
}
async function listSaleBatches(saleId, connection = null) {
  const [batches] = await db(connection).execute(`
    SELECT spb.*, u.name AS created_by_name, ru.name AS reversed_by_name
      FROM sale_payment_batches spb
      JOIN users u ON u.id = spb.created_by_user_id
      LEFT JOIN users ru ON ru.id = spb.reversed_by_user_id
     WHERE spb.sale_id = ?
     ORDER BY spb.created_at, spb.id
  `, [saleId]);
  for (const batch of batches) batch.allocations = await listBatchAllocations(batch.id, connection);
  return batches;
}
async function createReceivable(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO receivables (
      sale_id, sale_payment_allocation_id, customer_id, financial_category_id, source_type,
      installment_number, description, due_date, original_amount, outstanding_amount, status, created_by_user_id
    ) VALUES (?, ?, ?, NULL, 'SALE', ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.saleId, data.salePaymentAllocationId, data.customerId, data.installmentNumber,
    data.description, data.dueDate, data.originalAmount, data.outstandingAmount, data.status, data.userId
  ]);
  return result.insertId;
}
async function createReceipt(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO receipts (
      customer_id, payment_method_id, cash_session_id, received_by_user_id, operation_key,
      amount, status, received_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', CURRENT_TIMESTAMP(3), ?)
  `, [data.customerId, data.paymentMethodId, data.cashSessionId, data.userId, data.operationKey, data.amount, data.notes]);
  return result.insertId;
}
async function allocateReceipt(receiptId, receivableId, amount, connection) {
  await connection.execute('INSERT INTO receipt_allocations (receipt_id, receivable_id, amount) VALUES (?, ?, ?)', [receiptId, receivableId, amount]);
}
async function listSaleReceivables(saleId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT r.id, r.sale_payment_allocation_id, r.installment_number, r.description, r.due_date,
           r.original_amount, r.outstanding_amount, r.status, r.created_at,
           pm.code AS payment_method_code, pm.name AS payment_method_name
      FROM receivables r
      LEFT JOIN sale_payment_allocations spa ON spa.id = r.sale_payment_allocation_id
      LEFT JOIN payment_methods pm ON pm.id = spa.payment_method_id
     WHERE r.sale_id = ?
     ORDER BY r.due_date, r.installment_number, r.id
  `, [saleId]);
  return rows;
}
async function listSaleReceipts(saleId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT DISTINCT rc.id, rc.customer_id, rc.payment_method_id, rc.cash_session_id, rc.received_by_user_id,
           rc.operation_key, rc.amount, rc.status, rc.received_at, rc.reversed_at, rc.reversal_reason,
           pm.code AS payment_method_code, pm.name AS payment_method_name, u.name AS received_by_name
      FROM receipts rc
      JOIN payment_methods pm ON pm.id = rc.payment_method_id
      JOIN users u ON u.id = rc.received_by_user_id
      JOIN receipt_allocations ra ON ra.receipt_id = rc.id
      JOIN receivables r ON r.id = ra.receivable_id
     WHERE r.sale_id = ?
     ORDER BY rc.received_at, rc.id
  `, [saleId]);
  return rows;
}
async function listConfirmedBatchesForUpdate(saleId, connection) {
  const [rows] = await connection.execute("SELECT * FROM sale_payment_batches WHERE sale_id = ? AND status = 'CONFIRMED' ORDER BY id FOR UPDATE", [saleId]);
  return rows;
}
async function listConfirmedReceiptsForBatch(batchId, connection) {
  const [rows] = await connection.execute(`
    SELECT DISTINCT rc.*, pm.code AS payment_method_code, pm.requires_cash_session
      FROM receipts rc
      JOIN payment_methods pm ON pm.id = rc.payment_method_id
      JOIN receipt_allocations ra ON ra.receipt_id = rc.id
      JOIN receivables r ON r.id = ra.receivable_id
      JOIN sale_payment_allocations spa ON spa.id = r.sale_payment_allocation_id
     WHERE spa.payment_batch_id = ? AND rc.status = 'CONFIRMED'
     ORDER BY rc.id
  `, [batchId]);
  return rows;
}
async function reverseReceipt(receiptId, actorId, reason, connection) {
  await connection.execute(`
    UPDATE receipts
       SET status = 'REVERSED', reversed_at = CURRENT_TIMESTAMP(3), reversed_by_user_id = ?, reversal_reason = ?
     WHERE id = ? AND status = 'CONFIRMED'
  `, [actorId, reason, receiptId]);
}
async function cancelReceivablesForBatch(batchId, actorId, reason, connection) {
  await connection.execute(`
    UPDATE receivables r
    JOIN sale_payment_allocations spa ON spa.id = r.sale_payment_allocation_id
       SET r.status = 'CANCELLED', r.outstanding_amount = 0.00, r.cancelled_by_user_id = ?,
           r.cancelled_at = CURRENT_TIMESTAMP(3), r.cancellation_reason = ?
     WHERE spa.payment_batch_id = ? AND r.status <> 'CANCELLED'
  `, [actorId, reason, batchId]);
}
async function reversePaymentBatch(batchId, actorId, reason, connection) {
  await connection.execute(`
    UPDATE sale_payment_batches
       SET status = 'REVERSED', reversed_by_user_id = ?, reversed_at = CURRENT_TIMESTAMP(3), reversal_reason = ?
     WHERE id = ? AND status = 'CONFIRMED'
  `, [actorId, reason, batchId]);
}
async function hasUnbatchedAllocations(saleId, connection = null) {
  const [rows] = await db(connection).execute('SELECT id FROM sale_payment_allocations WHERE sale_id = ? AND payment_batch_id IS NULL LIMIT 1', [saleId]);
  return Boolean(rows[0]);
}
async function findReceiptByOperationKey(operationKey, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM receipts WHERE operation_key = ? LIMIT 1', [operationKey]);
  return rows[0] || null;
}

module.exports = {
  allocateReceipt, cancelReceivablesForBatch, createPaymentBatch, createReceivable, createReceipt,
  createSalePaymentAllocation, findBatchByOperationKey, findPaymentMethodById, findReceiptByOperationKey,
  findSaleById, findSaleForUpdate, hasUnbatchedAllocations, listBatchAllocations, listConfirmedBatchesForUpdate,
  listConfirmedReceiptsForBatch, listPaymentMethods, listSaleBatches, listSaleReceipts, listSaleReceivables,
  reversePaymentBatch, reverseReceipt, sumConfirmedAllocations
};
