'use strict';

const crypto = require('crypto');
const { HttpError } = require('./httpError');

const MAX_MONEY_CENTS = 999999999999999n;
const PURCHASE_STATUSES = new Set(['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']);

function parsePositiveId(value, label = 'Registro') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}
function optionalText(value, max, label) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (v.length > max) throw new HttpError(400, 'INVALID_PURCHASE_FIELD', `${label} excede ${max} caracteres.`);
  return v;
}
function normalizeDate(value, label, { required = false } = {}) {
  const v = String(value ?? '').trim();
  if (!v) {
    if (required) throw new HttpError(400, 'INVALID_PURCHASE_DATE', `${label} é obrigatória.`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, 'INVALID_PURCHASE_DATE', `${label} inválida.`);
  const parsed = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v) throw new HttpError(400, 'INVALID_PURCHASE_DATE', `${label} inválida.`);
  return v;
}
function moneyToCents(value, label, { nullable = false } = {}) {
  if ((value === null || value === undefined || value === '') && nullable) return null;
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(raw)) throw new HttpError(400, 'INVALID_MONEY', `${label} inválido.`);
  const [integer, decimal = ''] = raw.split('.');
  const cents = BigInt(integer) * 100n + BigInt((decimal + '00').slice(0, 2));
  if (cents > MAX_MONEY_CENTS) throw new HttpError(400, 'INVALID_MONEY', `${label} excede o limite permitido.`);
  return cents;
}
function centsToMoney(cents) { const value = BigInt(cents); return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`; }
function normalizeMoney(value, label, options) { const cents = moneyToCents(value, label, options); return cents === null ? null : centsToMoney(cents); }
function parseQuantity(value, label = 'Quantidade') {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw new HttpError(400, 'INVALID_QUANTITY', `${label} deve ser um inteiro entre 1 e 1000000.`);
  return quantity;
}
function normalizePurchaseHeader(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  if (!partial || has('supplierId')) out.supplierId = parsePositiveId(input?.supplierId, 'Fornecedor');
  if (!partial || has('documentNumber')) out.documentNumber = optionalText(input?.documentNumber, 100, 'Número do documento');
  if (!partial || has('purchaseDate')) out.purchaseDate = normalizeDate(input?.purchaseDate, 'Data da compra', { required: true });
  if (!partial || has('expectedDate')) out.expectedDate = normalizeDate(input?.expectedDate, 'Previsão de entrega');
  if (!partial || has('discountAmount')) out.discountAmount = normalizeMoney(input?.discountAmount ?? '0', 'Desconto da compra');
  if (!partial || has('freightAmount')) out.freightAmount = normalizeMoney(input?.freightAmount ?? '0', 'Frete');
  if (!partial || has('otherExpensesAmount')) out.otherExpensesAmount = normalizeMoney(input?.otherExpensesAmount ?? '0', 'Outras despesas');
  if (!partial || has('notes')) out.notes = optionalText(input?.notes, 10000, 'Observações');
  if (out.purchaseDate && out.expectedDate && out.expectedDate < out.purchaseDate) throw new HttpError(400, 'INVALID_EXPECTED_DATE', 'A previsão de entrega não pode ser anterior à data da compra.');
  return out;
}
function normalizePurchaseItem(input) {
  const skuId = parsePositiveId(input?.skuId, 'SKU');
  const quantityOrdered = parseQuantity(input?.quantityOrdered, 'Quantidade pedida');
  const unitCost = normalizeMoney(input?.unitCost, 'Custo unitário');
  const discountAmount = normalizeMoney(input?.discountAmount ?? '0', 'Desconto do item');
  const gross = BigInt(quantityOrdered) * moneyToCents(unitCost, 'Custo unitário');
  const discount = moneyToCents(discountAmount, 'Desconto do item');
  if (discount > gross) throw new HttpError(400, 'INVALID_ITEM_DISCOUNT', 'O desconto do item não pode superar seu valor bruto.');
  return { skuId, quantityOrdered, unitCost, discountAmount, lineTotal: centsToMoney(gross - discount) };
}
function calculatePurchaseTotal(subtotal, discountAmount, freightAmount, otherExpensesAmount) {
  const subtotalCents = moneyToCents(subtotal, 'Subtotal');
  const discountCents = moneyToCents(discountAmount, 'Desconto');
  const freightCents = moneyToCents(freightAmount, 'Frete');
  const otherCents = moneyToCents(otherExpensesAmount, 'Outras despesas');
  const total = subtotalCents - discountCents + freightCents + otherCents;
  if (total < 0n) throw new HttpError(400, 'INVALID_PURCHASE_TOTAL', 'O desconto total não pode tornar a compra negativa.');
  if (total > MAX_MONEY_CENTS) throw new HttpError(400, 'INVALID_PURCHASE_TOTAL', 'Total da compra excede o limite permitido.');
  return centsToMoney(total);
}
function normalizePurchaseStatusFilter(value) {
  const status = String(value ?? '').trim().toUpperCase();
  if (!status) return null;
  if (!PURCHASE_STATUSES.has(status)) throw new HttpError(400, 'INVALID_PURCHASE_STATUS', 'Status de compra inválido.');
  return status;
}
function normalizeCancellationReason(value) {
  const reason = String(value ?? '').trim();
  if (reason.length < 3 || reason.length > 500) throw new HttpError(400, 'INVALID_CANCELLATION_REASON', 'Informe um motivo de cancelamento entre 3 e 500 caracteres.');
  return reason;
}
function normalizeOperationKey(value) {
  const key = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._:-]{16,64}$/.test(key)) throw new HttpError(400, 'INVALID_OPERATION_KEY', 'Chave de operação inválida.');
  return key;
}
function normalizeReceipt(input) {
  const operationKey = normalizeOperationKey(input?.operationKey);
  const notes = optionalText(input?.notes, 500, 'Observações do recebimento');
  if (!Array.isArray(input?.items) || input.items.length < 1 || input.items.length > 200) throw new HttpError(400, 'INVALID_RECEIPT_ITEMS', 'O recebimento deve possuir de 1 a 200 itens.');
  const seen = new Set();
  const items = input.items.map((item) => {
    const purchaseItemId = parsePositiveId(item?.purchaseItemId, 'Item de compra');
    if (seen.has(purchaseItemId)) throw new HttpError(400, 'DUPLICATE_RECEIPT_ITEM', 'Um item de compra não pode aparecer duas vezes no mesmo recebimento.');
    seen.add(purchaseItemId);
    return { purchaseItemId, quantity: parseQuantity(item?.quantity, 'Quantidade recebida') };
  });
  return { operationKey, notes, items };
}
function stockOperationKey(receiptOperationKey, purchaseItemId) {
  return crypto.createHash('sha256').update(`purchase-receipt:${receiptOperationKey}:${purchaseItemId}`).digest('hex');
}

module.exports = { calculatePurchaseTotal, centsToMoney, moneyToCents, normalizeCancellationReason, normalizeOperationKey, normalizePurchaseHeader, normalizePurchaseItem, normalizePurchaseStatusFilter, normalizeReceipt, parsePositiveId, parseQuantity, stockOperationKey };
