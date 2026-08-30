'use strict';

const { HttpError } = require('./httpError');
const {
  centsToMoney,
  moneyToCents,
  normalizeOperationKey,
  parsePositiveId,
  splitInstallments
} = require('./cashPaymentValidation');

function text(value) { const v = String(value ?? '').trim(); return v || null; }
function optionalText(value, max, label) {
  const v = text(value);
  if (v && v.length > max) throw new HttpError(400, 'INVALID_FINANCE_FIELD', `${label} excede ${max} caracteres.`);
  return v;
}
function requiredText(value, min, max, label) {
  const v = String(value ?? '').trim();
  if (v.length < min || v.length > max) throw new HttpError(400, 'INVALID_FINANCE_FIELD', `${label} deve possuir entre ${min} e ${max} caracteres.`);
  return v;
}
function normalizeDate(value, label = 'Data') {
  const v = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, 'INVALID_DATE', `${label} inválida.`);
  const date = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v) throw new HttpError(400, 'INVALID_DATE', `${label} inválida.`);
  return v;
}
function normalizeOptionalDate(value, label = 'Data') { return text(value) ? normalizeDate(value, label) : null; }
function parseBoolean(value, label = 'Status') {
  if (typeof value === 'boolean') return value;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  throw new HttpError(400, 'INVALID_BOOLEAN', `${label} inválido.`);
}
function normalizeCategoryType(value) {
  const type = String(value ?? '').trim().toUpperCase();
  if (!['INCOME', 'EXPENSE'].includes(type)) throw new HttpError(400, 'INVALID_FINANCIAL_CATEGORY_TYPE', 'Tipo da categoria financeira inválido.');
  return type;
}
function normalizeFinancialCategory(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  if (!partial || has('type')) out.type = normalizeCategoryType(input?.type);
  if (!partial || has('code')) {
    const code = String(input?.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,60}$/.test(code)) throw new HttpError(400, 'INVALID_FINANCIAL_CATEGORY_CODE', 'Código da categoria deve possuir de 2 a 60 caracteres seguros.');
    out.code = code;
  }
  if (!partial || has('name')) out.name = requiredText(input?.name, 2, 120, 'Nome');
  if (!partial || has('parentId')) out.parentId = input?.parentId ? parsePositiveId(input.parentId, 'Categoria pai') : null;
  if (!partial || has('isActive')) out.isActive = has('isActive') ? parseBoolean(input.isActive) : true;
  return out;
}
function normalizeManualReceivable(input) {
  return {
    customerId: input?.customerId ? parsePositiveId(input.customerId, 'Cliente') : null,
    financialCategoryId: input?.financialCategoryId ? parsePositiveId(input.financialCategoryId, 'Categoria financeira') : null,
    description: requiredText(input?.description, 3, 255, 'Descrição'),
    dueDate: normalizeDate(input?.dueDate, 'Vencimento'),
    amount: centsToMoney(moneyToCents(input?.amount, { allowZero: false, label: 'Valor' })),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeManualPayable(input) {
  return {
    supplierId: input?.supplierId ? parsePositiveId(input.supplierId, 'Fornecedor') : null,
    financialCategoryId: input?.financialCategoryId ? parsePositiveId(input.financialCategoryId, 'Categoria financeira') : null,
    description: requiredText(input?.description, 3, 255, 'Descrição'),
    dueDate: normalizeDate(input?.dueDate, 'Vencimento'),
    amount: centsToMoney(moneyToCents(input?.amount, { allowZero: false, label: 'Valor' })),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeSettlement(input) {
  return {
    paymentMethodId: parsePositiveId(input?.paymentMethodId, 'Forma de pagamento'),
    cashSessionId: input?.cashSessionId ? parsePositiveId(input.cashSessionId, 'Sessão de caixa') : null,
    amount: centsToMoney(moneyToCents(input?.amount, { allowZero: false, label: 'Valor da liquidação' })),
    notes: optionalText(input?.notes, 500, 'Observações'),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeReversal(input) {
  return {
    reason: requiredText(input?.reason, 5, 500, 'Motivo'),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeCancellation(input) { return normalizeReversal(input); }
function normalizeFinancialization(input) {
  const operationKey = normalizeOperationKey(input?.operationKey);
  const installments = Array.isArray(input?.installments) ? input.installments : [];
  if (installments.length < 1 || installments.length > 36) throw new HttpError(400, 'INVALID_FINANCIALIZATION_INSTALLMENTS', 'Informe de 1 a 36 parcelas da compra.');
  return {
    operationKey,
    installments: installments.map((item, index) => ({
      installmentNumber: index + 1,
      dueDate: normalizeDate(item?.dueDate, `Vencimento da parcela ${index + 1}`),
      amount: centsToMoney(moneyToCents(item?.amount, { allowZero: false, label: `Valor da parcela ${index + 1}` }))
    }))
  };
}
function buildEqualInstallments(totalAmount, count, firstDueDate) {
  const installments = Number(count);
  if (!Number.isSafeInteger(installments) || installments < 1 || installments > 36) throw new HttpError(400, 'INVALID_INSTALLMENT_COUNT', 'Quantidade de parcelas deve ficar entre 1 e 36.');
  const first = normalizeDate(firstDueDate, 'Primeiro vencimento');
  const values = splitInstallments(totalAmount, installments);
  const [year, month, day] = first.split('-').map(Number);
  return values.map((amount, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return { installmentNumber: index + 1, dueDate: date.toISOString().slice(0, 10), amount };
  });
}
function normalizeStatusFilter(value) {
  const status = String(value ?? '').trim().toUpperCase();
  if (!status) return null;
  if (!['OPEN', 'PARTIAL', 'PAID', 'CANCELLED'].includes(status)) throw new HttpError(400, 'INVALID_FINANCE_STATUS', 'Status financeiro inválido.');
  return status;
}
function normalizeSourceType(value) {
  const source = String(value ?? '').trim().toUpperCase();
  if (!source) return null;
  if (!['SALE', 'PURCHASE', 'MANUAL'].includes(source)) throw new HttpError(400, 'INVALID_FINANCE_SOURCE', 'Origem financeira inválida.');
  return source;
}
function normalizeDateRange(query = {}) {
  const dateFrom = normalizeOptionalDate(query.dateFrom, 'Data inicial');
  const dateTo = normalizeOptionalDate(query.dateTo, 'Data final');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new HttpError(400, 'INVALID_DATE_RANGE', 'A data inicial não pode ser posterior à data final.');
  return { dateFrom, dateTo };
}

module.exports = {
  buildEqualInstallments,
  normalizeCancellation,
  normalizeDate,
  normalizeDateRange,
  normalizeFinancialCategory,
  normalizeFinancialization,
  normalizeManualPayable,
  normalizeManualReceivable,
  normalizeReversal,
  normalizeSettlement,
  normalizeSourceType,
  normalizeStatusFilter,
  parseBoolean
};
