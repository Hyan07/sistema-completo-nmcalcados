'use strict';

const { HttpError } = require('./httpError');

const MAX_MOVEMENT_QUANTITY = 1000000000;
const MAX_STOCK_QUANTITY = 1000000000;
const MANUAL_MOVEMENT_TYPES = new Set(['MANUAL_ENTRY', 'MANUAL_EXIT', 'LOSS']);

function parsePositiveId(value, label = 'Registro') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}

function parseQuantity(value, label = 'Quantidade') {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_MOVEMENT_QUANTITY) {
    throw new HttpError(400, 'INVALID_QUANTITY', `${label} deve ser um inteiro entre 1 e ${MAX_MOVEMENT_QUANTITY}.`);
  }
  return quantity;
}

function parseCountedQuantity(value) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_STOCK_QUANTITY) {
    throw new HttpError(400, 'INVALID_COUNTED_QUANTITY', `Saldo contado deve ser um inteiro entre 0 e ${MAX_STOCK_QUANTITY}.`);
  }
  return quantity;
}

function normalizeReason(value, { required = true } = {}) {
  const reason = String(value ?? '').trim();
  if (required && reason.length < 3) throw new HttpError(400, 'REASON_REQUIRED', 'Informe um motivo com pelo menos 3 caracteres.');
  if (reason.length > 500) throw new HttpError(400, 'REASON_TOO_LONG', 'O motivo deve possuir no máximo 500 caracteres.');
  return reason || null;
}

function normalizeOperationKey(value) {
  const key = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._:-]{16,64}$/.test(key)) {
    throw new HttpError(400, 'INVALID_OPERATION_KEY', 'Chave da operação inválida.');
  }
  return key;
}

function normalizeManualMovement(input = {}) {
  const typeCode = String(input.typeCode || '').trim().toUpperCase();
  if (!MANUAL_MOVEMENT_TYPES.has(typeCode)) {
    throw new HttpError(400, 'INVALID_MOVEMENT_TYPE', 'Tipo de movimentação manual inválido.');
  }
  return {
    typeCode,
    quantity: parseQuantity(input.quantity),
    reason: normalizeReason(input.reason),
    operationKey: normalizeOperationKey(input.operationKey)
  };
}

function normalizeInventoryCount(input = {}) {
  return {
    countedQuantity: parseCountedQuantity(input.countedQuantity),
    reason: normalizeReason(input.reason),
    operationKey: normalizeOperationKey(input.operationKey)
  };
}

function calculateNewBalance(previousQuantity, direction, quantity) {
  const previous = Number(previousQuantity);
  const amount = parseQuantity(quantity);
  if (!Number.isSafeInteger(previous) || previous < 0) throw new HttpError(500, 'INVALID_STOCK_STATE', 'Saldo de estoque inválido.');
  if (direction !== 'IN' && direction !== 'OUT') throw new HttpError(500, 'INVALID_MOVEMENT_DIRECTION', 'Direção da movimentação inválida.');
  const change = direction === 'IN' ? amount : -amount;
  const next = previous + change;
  if (next < 0) throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Estoque insuficiente para esta saída.');
  if (next > MAX_STOCK_QUANTITY) throw new HttpError(409, 'STOCK_LIMIT_EXCEEDED', 'O saldo resultante excede o limite operacional permitido.');
  return { quantityChange: change, newQuantity: next };
}

function stockStatus({ quantity, minimumStock, active = true }) {
  const current = Number(quantity || 0);
  const minimum = Number(minimumStock || 0);
  if (!active) return current > 0 ? 'INACTIVE_WITH_STOCK' : 'INACTIVE';
  if (current === 0) return 'OUT_OF_STOCK';
  if (current <= minimum) return 'LOW_STOCK';
  return 'OK';
}

function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize || '25', 10) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function parseDateFilter(value, label) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new HttpError(400, 'INVALID_DATE_FILTER', `${label} inválida.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new HttpError(400, 'INVALID_DATE_FILTER', `${label} inválida.`);
  return text;
}

module.exports = {
  MANUAL_MOVEMENT_TYPES,
  calculateNewBalance,
  normalizeInventoryCount,
  normalizeManualMovement,
  normalizeOperationKey,
  normalizeReason,
  parseCountedQuantity,
  parseDateFilter,
  parsePagination,
  parsePositiveId,
  parseQuantity,
  stockStatus
};
