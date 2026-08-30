'use strict';

const { getPool } = require('../config/database');
const paymentRepository = require('../repositories/paymentRepository');
const cashRepository = require('../repositories/cashRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const {
  addMonths, centsToMoney, derivedKey, moneyToCents, normalizeDate, normalizePaymentRequest,
  parsePositiveId, splitInstallments, sumMoney
} = require('../utils/cashPaymentValidation');

async function listPaymentMethods() { return paymentRepository.listPaymentMethods(); }
function paymentStatus(total, allocated) {
  const totalCents = moneyToCents(total), allocatedCents = moneyToCents(allocated);
  if (allocatedCents === 0) return 'UNPAID';
  if (allocatedCents < totalCents) return 'PARTIAL';
  return 'SETTLED';
}
async function getSalePayments(saleId) {
  const id = parsePositiveId(saleId, 'Venda');
  const sale = await paymentRepository.findSaleById(id);
  if (!sale) throw new HttpError(404, 'SALE_NOT_FOUND', 'Venda não encontrada.');
  const [allocated, batches, receivables, receipts] = await Promise.all([
    paymentRepository.sumConfirmedAllocations(id),
    paymentRepository.listSaleBatches(id),
    paymentRepository.listSaleReceivables(id),
    paymentRepository.listSaleReceipts(id)
  ]);
  const remainingCents = Math.max(0, moneyToCents(sale.total_amount) - moneyToCents(allocated));
  return {
    saleId: id,
    saleNumber: sale.sale_number,
    saleStatus: sale.status,
    totalAmount: String(sale.total_amount),
    allocatedAmount: allocated,
    remainingAmount: centsToMoney(remainingCents),
    paymentStatus: paymentStatus(String(sale.total_amount), allocated),
    batches, receivables, receipts
  };
}
function normalizedPaymentSignature(payments) {
  return payments.map((p) => ({ paymentMethodId: Number(p.paymentMethodId || p.payment_method_id), amount: String(p.amount), installments: Number(p.installments) }))
    .sort((a, b) => a.paymentMethodId - b.paymentMethodId || a.amount.localeCompare(b.amount) || a.installments - b.installments);
}
function existingPaymentSignature(allocations) {
  return allocations.map((p) => ({ paymentMethodId: Number(p.payment_method_id), amount: String(p.amount), installments: Number(p.installments) }))
    .sort((a, b) => a.paymentMethodId - b.paymentMethodId || a.amount.localeCompare(b.amount) || a.installments - b.installments);
}
function verifyBatchDuplicate(batch, saleId, request) {
  if (Number(batch.sale_id) !== Number(saleId) || Number(batch.cash_session_id || 0) !== Number(request.cashSessionId || 0) || JSON.stringify(existingPaymentSignature(batch.allocations)) !== JSON.stringify(normalizedPaymentSignature(request.payments))) {
    throw new HttpError(409, 'PAYMENT_OPERATION_KEY_REUSED', 'A chave do pagamento já foi utilizada com outros dados.');
  }
  return { batchId: Number(batch.id), duplicate: true };
}
async function validateCashSession(cashSessionId, actorId, connection) {
  if (!cashSessionId) return null;
  const session = await cashRepository.findSessionForUpdate(cashSessionId, connection);
  if (!session) throw new HttpError(404, 'CASH_SESSION_NOT_FOUND', 'Sessão de caixa não encontrada.');
  if (session.status !== 'OPEN') throw new HttpError(409, 'CASH_SESSION_CLOSED', 'A sessão de caixa informada está fechada.');
  if (Number(session.operator_user_id) !== Number(actorId)) throw new HttpError(409, 'CASH_SESSION_OPERATOR_MISMATCH', 'A sessão de caixa pertence a outro operador.');
  return session;
}
async function createImmediateReceipt({ sale, allocationId, method, amount, batch, actorId, operationKey }, connection) {
  const saleDate = normalizeDate(sale.sale_date);
  const receivableId = await paymentRepository.createReceivable({
    saleId: sale.id, salePaymentAllocationId: allocationId, customerId: sale.customer_id,
    installmentNumber: 1, description: `Venda ${sale.sale_number} - ${method.name}`,
    dueDate: saleDate, originalAmount: amount, outstandingAmount: '0.00', status: 'PAID', userId: actorId
  }, connection);
  const receiptKey = derivedKey(operationKey, 'receipt', allocationId);
  const receiptId = await paymentRepository.createReceipt({ customerId: sale.customer_id, paymentMethodId: method.id, cashSessionId: batch.cashSessionId, userId: actorId, operationKey: receiptKey, amount, notes: `Recebimento da venda ${sale.sale_number}` }, connection);
  await paymentRepository.allocateReceipt(receiptId, receivableId, amount, connection);
  if (method.code === 'CASH') {
    const type = await cashRepository.findMovementTypeByCode('SALE_RECEIPT', connection);
    if (!type || !type.is_active) throw new HttpError(500, 'CASH_MOVEMENT_TYPE_MISSING', 'Tipo SALE_RECEIPT não configurado.');
    await cashRepository.insertCashMovement({ cashSessionId: batch.cashSessionId, cashMovementTypeId: type.id, receiptId, userId: actorId, operationKey: derivedKey(operationKey, 'cash', allocationId), amount, notes: `Venda ${sale.sale_number}` }, connection);
  }
  return { receivableId, receiptId };
}
async function createDeferredReceivables({ sale, allocationId, method, amount, installments, actorId }, connection) {
  const saleDate = normalizeDate(sale.sale_date);
  const values = splitInstallments(amount, installments);
  const ids = [];
  for (let i = 0; i < values.length; i += 1) {
    const dueDate = method.code === 'CREDIT_CARD' ? addMonths(saleDate, i + 1) : saleDate;
    ids.push(await paymentRepository.createReceivable({
      saleId: sale.id, salePaymentAllocationId: allocationId, customerId: null,
      installmentNumber: i + 1, description: `Venda ${sale.sale_number} - ${method.name} ${i + 1}/${values.length}`,
      dueDate, originalAmount: values[i], outstandingAmount: values[i], status: 'OPEN', userId: actorId
    }, connection));
  }
  return ids;
}
async function recordSalePayments(saleId, input, actor) {
  const id = parsePositiveId(saleId, 'Venda');
  const request = normalizePaymentRequest(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const duplicate = await paymentRepository.findBatchByOperationKey(request.operationKey, connection);
    if (duplicate) { const result = verifyBatchDuplicate(duplicate, id, request); await connection.commit(); return result; }
    const sale = await paymentRepository.findSaleForUpdate(id, connection);
    if (!sale) throw new HttpError(404, 'SALE_NOT_FOUND', 'Venda não encontrada.');
    if (sale.status !== 'COMPLETED') throw new HttpError(409, 'SALE_NOT_PAYABLE', 'Somente venda concluída pode receber pagamentos.');
    const session = await validateCashSession(request.cashSessionId, actor.id, connection);
    const allocatedCents = moneyToCents(await paymentRepository.sumConfirmedAllocations(id, connection));
    const totalCents = moneyToCents(sale.total_amount);
    const remainingCents = totalCents - allocatedCents;
    const requestedCents = sumMoney(request.payments.map((p) => p.amount));
    if (remainingCents <= 0) throw new HttpError(409, 'SALE_ALREADY_SETTLED', 'A venda já está totalmente alocada em formas de pagamento.');
    if (requestedCents > remainingCents) throw new HttpError(409, 'PAYMENT_EXCEEDS_REMAINING', `Pagamentos excedem o saldo restante de ${centsToMoney(remainingCents)}.`);

    const methods = [];
    for (const payment of request.payments) {
      const method = await paymentRepository.findPaymentMethodById(payment.paymentMethodId, connection);
      if (!method || !method.is_active) throw new HttpError(400, 'PAYMENT_METHOD_UNAVAILABLE', 'Forma de pagamento inexistente ou inativa.');
      if (method.requires_cash_session && !session) throw new HttpError(409, 'CASH_SESSION_REQUIRED', `${method.name} exige sessão de caixa aberta.`);
      if (payment.installments > 1 && method.code !== 'CREDIT_CARD') throw new HttpError(400, 'INSTALLMENTS_NOT_ALLOWED', 'Parcelamento acima de 1x é permitido somente no cartão de crédito nesta fase.');
      methods.push(method);
    }

    const batchId = await paymentRepository.createPaymentBatch({ saleId: id, cashSessionId: request.cashSessionId, operationKey: request.operationKey }, actor.id, connection);
    for (let index = 0; index < request.payments.length; index += 1) {
      const payment = request.payments[index], method = methods[index];
      const allocationId = await paymentRepository.createSalePaymentAllocation({ saleId: id, paymentBatchId: batchId, paymentMethodId: method.id, amount: payment.amount, installments: payment.installments, notes: payment.notes }, connection);
      if (method.creates_receivable) {
        await createDeferredReceivables({ sale, allocationId, method, amount: payment.amount, installments: payment.installments, actorId: actor.id }, connection);
      } else {
        await createImmediateReceipt({ sale, allocationId, method, amount: payment.amount, batch: { cashSessionId: request.cashSessionId }, actorId: actor.id, operationKey: request.operationKey }, connection);
      }
    }
    const newAllocatedCents = allocatedCents + requestedCents;
    await createAuditLog({ userId: actor.id, actionCode: 'SALE_PAYMENT_BATCH_CREATED', entityType: 'SALE_PAYMENT_BATCH', entityId: batchId, newData: { saleId: String(id), operationKey: request.operationKey, amount: centsToMoney(requestedCents), paymentStatus: newAllocatedCents === totalCents ? 'SETTLED' : 'PARTIAL' } }, connection);
    await connection.commit();
    return { batchId, duplicate: false, allocatedAmount: centsToMoney(newAllocatedCents), remainingAmount: centsToMoney(totalCents - newAllocatedCents), paymentStatus: newAllocatedCents === totalCents ? 'SETTLED' : 'PARTIAL' };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = await paymentRepository.findBatchByOperationKey(request.operationKey);
      if (duplicate) return verifyBatchDuplicate(duplicate, id, request);
    }
    throw error;
  } finally { connection.release(); }
}
async function reverseSalePaymentsWithinTransaction(sale, reason, cancellationKey, actorId, connection) {
  const batches = await paymentRepository.listConfirmedBatchesForUpdate(sale.id, connection);
  let reversedReceipts = 0;
  const reversalType = batches.length ? await cashRepository.findMovementTypeByCode('RECEIPT_REVERSAL', connection) : null;
  for (const batch of batches) {
    const receipts = await paymentRepository.listConfirmedReceiptsForBatch(batch.id, connection);
    for (const receipt of receipts) {
      if (receipt.payment_method_code === 'CASH') {
        if (!receipt.cash_session_id) throw new HttpError(500, 'CASH_RECEIPT_WITHOUT_SESSION', 'Recebimento em dinheiro sem sessão de caixa vinculada.');
        const session = await cashRepository.findSessionForUpdate(receipt.cash_session_id, connection);
        if (!session || session.status !== 'OPEN') throw new HttpError(409, 'CLOSED_CASH_SESSION_REFUND_REQUIRES_FINANCE', 'Venda possui recebimento em dinheiro de caixa já fechado; o estorno exige fluxo financeiro posterior.');
        if (!reversalType || !reversalType.is_active) throw new HttpError(500, 'CASH_REVERSAL_TYPE_MISSING', 'Tipo de estorno de caixa não configurado.');
        await cashRepository.insertCashMovement({ cashSessionId: receipt.cash_session_id, cashMovementTypeId: reversalType.id, receiptId: receipt.id, userId: actorId, operationKey: derivedKey(cancellationKey, 'receipt-reversal', receipt.id), amount: String(receipt.amount), notes: `Estorno da venda ${sale.sale_number}: ${reason}` }, connection);
      }
      await paymentRepository.reverseReceipt(receipt.id, actorId, reason, connection);
      reversedReceipts += 1;
    }
    await paymentRepository.cancelReceivablesForBatch(batch.id, actorId, reason, connection);
    await paymentRepository.reversePaymentBatch(batch.id, actorId, reason, connection);
  }
  return { reversedBatches: batches.length, reversedReceipts };
}

module.exports = { getSalePayments, listPaymentMethods, recordSalePayments, reverseSalePaymentsWithinTransaction };
