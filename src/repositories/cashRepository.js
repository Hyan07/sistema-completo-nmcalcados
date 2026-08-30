'use strict';

const { getPool } = require('../config/database');
function db(connection) { return connection || getPool(); }

async function listRegisters() {
  const [rows] = await getPool().query(`
    SELECT cr.id, cr.code, cr.name, cr.is_active, cr.created_at, cr.updated_at,
           cs.id AS open_session_id, cs.operator_user_id, u.name AS open_operator_name, cs.opened_at
      FROM cash_registers cr
      LEFT JOIN cash_sessions cs ON cs.cash_register_id = cr.id AND cs.status = 'OPEN'
      LEFT JOIN users u ON u.id = cs.operator_user_id
     ORDER BY cr.is_active DESC, cr.name, cr.id
  `);
  return rows;
}
async function findRegisterById(id, connection = null, { forUpdate = false } = {}) {
  const [rows] = await db(connection).execute(`SELECT id, code, name, is_active FROM cash_registers WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}
async function createRegister(data, connection) {
  const [result] = await connection.execute('INSERT INTO cash_registers (code, name, is_active) VALUES (?, ?, ?)', [data.code, data.name, data.isActive]);
  return result.insertId;
}
async function updateRegister(id, data, connection) {
  const columns = [], values = [];
  if (Object.prototype.hasOwnProperty.call(data, 'code')) { columns.push('code = ?'); values.push(data.code); }
  if (Object.prototype.hasOwnProperty.call(data, 'name')) { columns.push('name = ?'); values.push(data.name); }
  if (Object.prototype.hasOwnProperty.call(data, 'isActive')) { columns.push('is_active = ?'); values.push(data.isActive); }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE cash_registers SET ${columns.join(', ')} WHERE id = ?`, values);
}
async function lockUser(userId, connection) {
  const [rows] = await connection.execute('SELECT id, is_active FROM users WHERE id = ? FOR UPDATE', [userId]);
  return rows[0] || null;
}
async function findOpenSessionByRegister(registerId, connection = null) {
  const [rows] = await db(connection).execute("SELECT * FROM cash_sessions WHERE cash_register_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1", [registerId]);
  return rows[0] || null;
}
async function findOpenSessionByOperator(userId, connection = null) {
  const [rows] = await db(connection).execute("SELECT * FROM cash_sessions WHERE operator_user_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1", [userId]);
  return rows[0] || null;
}
async function findSessionByOpeningKey(operationKey, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM cash_sessions WHERE opening_operation_key = ? LIMIT 1', [operationKey]);
  return rows[0] || null;
}
async function findSessionByClosingKey(operationKey, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM cash_sessions WHERE closing_operation_key = ? LIMIT 1', [operationKey]);
  return rows[0] || null;
}
async function createSession(data, actorId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO cash_sessions (cash_register_id, operator_user_id, opening_operation_key, status, opening_balance, opened_at, notes)
    VALUES (?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP(3), ?)
  `, [data.cashRegisterId, actorId, data.operationKey, data.openingBalance, data.notes]);
  return result.insertId;
}
async function findSessionById(id, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT cs.*, cr.code AS register_code, cr.name AS register_name,
           operator.name AS operator_name, closer.name AS closed_by_name
      FROM cash_sessions cs
      JOIN cash_registers cr ON cr.id = cs.cash_register_id
      JOIN users operator ON operator.id = cs.operator_user_id
      LEFT JOIN users closer ON closer.id = cs.closed_by_user_id
     WHERE cs.id = ? LIMIT 1
  `, [id]);
  return rows[0] || null;
}
async function findSessionForUpdate(id, connection) {
  const [rows] = await connection.execute('SELECT * FROM cash_sessions WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}
async function listSessions({ status = null, limit = 50 } = {}) {
  const params = [];
  let where = '';
  if (status) { where = 'WHERE cs.status = ?'; params.push(status); }
  params.push(limit);
  const [rows] = await getPool().execute(`
    SELECT cs.id, cs.cash_register_id, cs.operator_user_id, cs.status, cs.opening_balance,
           cs.expected_closing_balance, cs.declared_closing_balance, cs.closing_difference,
           cs.opened_at, cs.closed_at, cr.code AS register_code, cr.name AS register_name,
           u.name AS operator_name
      FROM cash_sessions cs
      JOIN cash_registers cr ON cr.id = cs.cash_register_id
      JOIN users u ON u.id = cs.operator_user_id
      ${where}
     ORDER BY cs.opened_at DESC, cs.id DESC
     LIMIT ?
  `, params);
  return rows;
}
async function calculateExpectedCash(sessionId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT cs.opening_balance,
           COALESCE(SUM(CASE cmt.direction WHEN 'IN' THEN cm.amount WHEN 'OUT' THEN -cm.amount ELSE 0 END), 0.00) AS movement_net,
           cs.opening_balance + COALESCE(SUM(CASE cmt.direction WHEN 'IN' THEN cm.amount WHEN 'OUT' THEN -cm.amount ELSE 0 END), 0.00) AS expected_balance
      FROM cash_sessions cs
      LEFT JOIN cash_movements cm ON cm.cash_session_id = cs.id
      LEFT JOIN cash_movement_types cmt ON cmt.id = cm.cash_movement_type_id
     WHERE cs.id = ?
     GROUP BY cs.id, cs.opening_balance
  `, [sessionId]);
  return rows[0] || null;
}
async function listSessionPaymentTotals(sessionId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT pm.id AS payment_method_id, pm.code, pm.name,
           COALESCE(SUM(spa.amount), 0.00) AS amount
      FROM sale_payment_batches spb
      JOIN sale_payment_allocations spa ON spa.payment_batch_id = spb.id
      JOIN payment_methods pm ON pm.id = spa.payment_method_id
     WHERE spb.cash_session_id = ? AND spb.status = 'CONFIRMED'
     GROUP BY pm.id, pm.code, pm.name
     ORDER BY pm.sort_order, pm.name
  `, [sessionId]);
  return rows;
}
async function findMovementTypeByCode(code, connection = null) {
  const [rows] = await db(connection).execute('SELECT id, code, name, direction, is_active FROM cash_movement_types WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}
async function findCashMovementByOperationKey(operationKey, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT cm.*, cmt.code AS type_code, cmt.direction
      FROM cash_movements cm
      JOIN cash_movement_types cmt ON cmt.id = cm.cash_movement_type_id
     WHERE cm.operation_key = ? LIMIT 1
  `, [operationKey]);
  return rows[0] || null;
}
async function insertCashMovement(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO cash_movements (
      cash_session_id, cash_movement_type_id, receipt_id, disbursement_id,
      created_by_user_id, operation_key, amount, happened_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP(3)), ?)
  `, [
    data.cashSessionId, data.cashMovementTypeId, data.receiptId || null, data.disbursementId || null,
    data.userId, data.operationKey, data.amount, data.happenedAt || null, data.notes || null
  ]);
  return result.insertId;
}
async function listCashMovements(sessionId, connection = null) {
  const [rows] = await db(connection).execute(`
    SELECT cm.id, cm.operation_key, cm.amount, cm.happened_at, cm.notes, cm.receipt_id,
           cmt.code AS type_code, cmt.name AS type_name, cmt.direction,
           u.id AS user_id, u.name AS user_name
      FROM cash_movements cm
      JOIN cash_movement_types cmt ON cmt.id = cm.cash_movement_type_id
      JOIN users u ON u.id = cm.created_by_user_id
     WHERE cm.cash_session_id = ?
     ORDER BY cm.happened_at DESC, cm.id DESC
  `, [sessionId]);
  return rows;
}
async function closeSession(id, data, actorId, expectedBalance, difference, connection) {
  await connection.execute(`
    UPDATE cash_sessions
       SET status = 'CLOSED', expected_closing_balance = ?, declared_closing_balance = ?, closing_difference = ?,
           closed_by_user_id = ?, closing_operation_key = ?, closed_at = CURRENT_TIMESTAMP(3),
           notes = CASE WHEN ? IS NULL THEN notes ELSE CONCAT_WS('\n', notes, ?) END
     WHERE id = ?
  `, [expectedBalance, data.declaredClosingBalance, difference, actorId, data.operationKey, data.notes, data.notes, id]);
}
async function hasOpenSession(registerId, connection = null) {
  return Boolean(await findOpenSessionByRegister(registerId, connection));
}

module.exports = {
  calculateExpectedCash, closeSession, createRegister, createSession, findCashMovementByOperationKey,
  findMovementTypeByCode, findOpenSessionByOperator, findOpenSessionByRegister, findRegisterById,
  findSessionByClosingKey, findSessionById, findSessionByOpeningKey, findSessionForUpdate, hasOpenSession,
  insertCashMovement, listCashMovements, listRegisters, listSessionPaymentTotals, listSessions, lockUser, updateRegister
};
