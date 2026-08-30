'use strict';

const { getPool } = require('../config/database');
const cashRepository = require('../repositories/cashRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const {
  centsToMoney, moneyToCents, normalizeCloseSession, normalizeManualCashMovement,
  normalizeOpenSession, normalizeRegister, parsePositiveId
} = require('../utils/cashPaymentValidation');

async function listRegisters() { return cashRepository.listRegisters(); }
async function listSessions(query = {}) {
  const status = String(query.status || '').trim().toUpperCase();
  if (status && !['OPEN', 'CLOSED'].includes(status)) throw new HttpError(400, 'INVALID_CASH_SESSION_STATUS', 'Status de sessão inválido.');
  return cashRepository.listSessions({ status: status || null, limit: 100 });
}
async function createRegister(input, actor) {
  const data = normalizeRegister(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const id = await cashRepository.createRegister(data, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CASH_REGISTER_CREATED', entityType: 'CASH_REGISTER', entityId: id, newData: { code: data.code, name: data.name, isActive: data.isActive } }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'CASH_REGISTER_CODE_EXISTS', 'Já existe caixa com este código.');
    throw error;
  } finally { connection.release(); }
}
async function updateRegister(registerId, input, actor) {
  const id = parsePositiveId(registerId, 'Caixa');
  const changes = normalizeRegister(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await cashRepository.findRegisterById(id, connection, { forUpdate: true });
    if (!current) throw new HttpError(404, 'CASH_REGISTER_NOT_FOUND', 'Caixa não encontrado.');
    if (changes.isActive === false && await cashRepository.hasOpenSession(id, connection)) throw new HttpError(409, 'CASH_REGISTER_HAS_OPEN_SESSION', 'Não é possível inativar um caixa com sessão aberta.');
    await cashRepository.updateRegister(id, changes, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CASH_REGISTER_UPDATED', entityType: 'CASH_REGISTER', entityId: id, newData: { fields: Object.keys(changes).sort(), ...(Object.prototype.hasOwnProperty.call(changes, 'isActive') ? { isActive: changes.isActive } : {}) } }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'CASH_REGISTER_CODE_EXISTS', 'Já existe caixa com este código.');
    throw error;
  } finally { connection.release(); }
}
function verifyOpenDuplicate(existing, data, actorId) {
  if (Number(existing.cash_register_id) !== data.cashRegisterId || Number(existing.operator_user_id) !== Number(actorId) || moneyToCents(existing.opening_balance) !== moneyToCents(data.openingBalance)) {
    throw new HttpError(409, 'CASH_OPEN_KEY_REUSED', 'A chave de abertura já foi utilizada com outros dados.');
  }
  return { sessionId: Number(existing.id), duplicate: true, status: existing.status };
}
async function openSession(input, actor) {
  const data = normalizeOpenSession(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const duplicate = await cashRepository.findSessionByOpeningKey(data.operationKey, connection);
    if (duplicate) { const result = verifyOpenDuplicate(duplicate, data, actor.id); await connection.commit(); return result; }
    const user = await cashRepository.lockUser(actor.id, connection);
    if (!user || !user.is_active) throw new HttpError(403, 'USER_INACTIVE', 'Usuário inativo não pode abrir caixa.');
    const register = await cashRepository.findRegisterById(data.cashRegisterId, connection, { forUpdate: true });
    if (!register || !register.is_active) throw new HttpError(409, 'CASH_REGISTER_UNAVAILABLE', 'Caixa inexistente ou inativo.');
    if (await cashRepository.findOpenSessionByRegister(data.cashRegisterId, connection)) throw new HttpError(409, 'CASH_REGISTER_ALREADY_OPEN', 'Este caixa já possui sessão aberta.');
    if (await cashRepository.findOpenSessionByOperator(actor.id, connection)) throw new HttpError(409, 'OPERATOR_ALREADY_HAS_OPEN_CASH', 'Este operador já possui uma sessão de caixa aberta.');
    const sessionId = await cashRepository.createSession(data, actor.id, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CASH_SESSION_OPENED', entityType: 'CASH_SESSION', entityId: sessionId, newData: { cashRegisterId: String(data.cashRegisterId), openingBalance: data.openingBalance, operationKey: data.operationKey } }, connection);
    await connection.commit();
    return { sessionId, duplicate: false, status: 'OPEN' };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = await cashRepository.findSessionByOpeningKey(data.operationKey);
      if (duplicate) return verifyOpenDuplicate(duplicate, data, actor.id);
    }
    throw error;
  } finally { connection.release(); }
}
async function getCurrentSession(actor) {
  const session = await cashRepository.findOpenSessionByOperator(parsePositiveId(actor.id, 'Usuário'));
  if (!session) return null;
  return getSession(session.id);
}
async function getSession(sessionId) {
  const id = parsePositiveId(sessionId, 'Sessão de caixa');
  const session = await cashRepository.findSessionById(id);
  if (!session) throw new HttpError(404, 'CASH_SESSION_NOT_FOUND', 'Sessão de caixa não encontrada.');
  const [expected, paymentTotals, movements] = await Promise.all([
    cashRepository.calculateExpectedCash(id),
    cashRepository.listSessionPaymentTotals(id),
    cashRepository.listCashMovements(id)
  ]);
  return { session, expectedCash: expected, paymentTotals, movements };
}
function verifyMovementDuplicate(existing, sessionId, request) {
  if (Number(existing.cash_session_id) !== Number(sessionId) || existing.type_code !== request.typeCode || moneyToCents(existing.amount) !== moneyToCents(request.amount)) {
    throw new HttpError(409, 'CASH_MOVEMENT_KEY_REUSED', 'A chave desta movimentação já foi utilizada com outros dados.');
  }
  return { movementId: Number(existing.id), duplicate: true };
}
async function createManualMovement(sessionId, input, actor) {
  const id = parsePositiveId(sessionId, 'Sessão de caixa');
  const request = normalizeManualCashMovement(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const duplicate = await cashRepository.findCashMovementByOperationKey(request.operationKey, connection);
    if (duplicate) { const result = verifyMovementDuplicate(duplicate, id, request); await connection.commit(); return result; }
    const session = await cashRepository.findSessionForUpdate(id, connection);
    if (!session) throw new HttpError(404, 'CASH_SESSION_NOT_FOUND', 'Sessão de caixa não encontrada.');
    if (session.status !== 'OPEN') throw new HttpError(409, 'CASH_SESSION_CLOSED', 'Não é possível movimentar caixa fechado.');
    const type = await cashRepository.findMovementTypeByCode(request.typeCode, connection);
    if (!type || !type.is_active) throw new HttpError(400, 'CASH_MOVEMENT_TYPE_UNAVAILABLE', 'Tipo de movimento indisponível.');
    const movementId = await cashRepository.insertCashMovement({ cashSessionId: id, cashMovementTypeId: type.id, userId: actor.id, operationKey: request.operationKey, amount: request.amount, notes: request.reason }, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CASH_MANUAL_MOVEMENT_CREATED', entityType: 'CASH_MOVEMENT', entityId: movementId, newData: { cashSessionId: String(id), typeCode: request.typeCode, amount: request.amount, operationKey: request.operationKey } }, connection);
    await connection.commit();
    return { movementId, duplicate: false };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = await cashRepository.findCashMovementByOperationKey(request.operationKey);
      if (duplicate) return verifyMovementDuplicate(duplicate, id, request);
    }
    throw error;
  } finally { connection.release(); }
}
function verifyCloseDuplicate(existing, sessionId, request) {
  if (Number(existing.id) !== Number(sessionId) || moneyToCents(existing.declared_closing_balance) !== moneyToCents(request.declaredClosingBalance)) {
    throw new HttpError(409, 'CASH_CLOSE_KEY_REUSED', 'A chave de fechamento já foi utilizada com outros dados.');
  }
  return { sessionId: Number(existing.id), duplicate: true, status: existing.status };
}
async function closeSession(sessionId, input, actor) {
  const id = parsePositiveId(sessionId, 'Sessão de caixa');
  const request = normalizeCloseSession(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const duplicate = await cashRepository.findSessionByClosingKey(request.operationKey, connection);
    if (duplicate) { const result = verifyCloseDuplicate(duplicate, id, request); await connection.commit(); return result; }
    const session = await cashRepository.findSessionForUpdate(id, connection);
    if (!session) throw new HttpError(404, 'CASH_SESSION_NOT_FOUND', 'Sessão de caixa não encontrada.');
    if (session.status !== 'OPEN') throw new HttpError(409, 'CASH_SESSION_ALREADY_CLOSED', 'Sessão de caixa já está fechada.');
    const expected = await cashRepository.calculateExpectedCash(id, connection);
    const expectedCents = moneyToCents(expected.expected_balance);
    const declaredCents = moneyToCents(request.declaredClosingBalance);
    const difference = centsToMoney(declaredCents - expectedCents);
    await cashRepository.closeSession(id, request, actor.id, centsToMoney(expectedCents), difference, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'CASH_SESSION_CLOSED', entityType: 'CASH_SESSION', entityId: id, newData: { expectedClosingBalance: centsToMoney(expectedCents), declaredClosingBalance: request.declaredClosingBalance, difference, operationKey: request.operationKey } }, connection);
    await connection.commit();
    return { sessionId: id, duplicate: false, status: 'CLOSED', expectedClosingBalance: centsToMoney(expectedCents), declaredClosingBalance: request.declaredClosingBalance, difference };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = await cashRepository.findSessionByClosingKey(request.operationKey);
      if (duplicate) return verifyCloseDuplicate(duplicate, id, request);
    }
    throw error;
  } finally { connection.release(); }
}

module.exports = { closeSession, createManualMovement, createRegister, getCurrentSession, getSession, listRegisters, listSessions, openSession, updateRegister };
