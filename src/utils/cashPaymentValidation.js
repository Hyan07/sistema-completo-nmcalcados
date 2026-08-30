'use strict';

const crypto = require('crypto');
const { HttpError } = require('./httpError');

function text(value) { const v = String(value ?? '').trim(); return v || null; }
function parsePositiveId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}
function normalizeOperationKey(value) {
  const key = String(value ?? '').trim();
  if (key.length < 16 || key.length > 64 || !/^[A-Za-z0-9:_-]+$/.test(key)) {
    throw new HttpError(400, 'INVALID_OPERATION_KEY', 'A chave da operação deve possuir entre 16 e 64 caracteres seguros.');
  }
  return key;
}
function moneyToCents(value, { allowZero = true, label = 'Valor' } = {}) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new HttpError(400, 'INVALID_MONEY', `${label} inválido.`);
  const [whole, fraction = ''] = raw.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents < 0 || (!allowZero && cents === 0)) throw new HttpError(400, 'INVALID_MONEY', `${label} inválido.`);
  return cents;
}
function centsToMoney(cents) {
  const value = Number(cents);
  if (!Number.isSafeInteger(value)) throw new HttpError(500, 'INVALID_INTERNAL_MONEY', 'Valor monetário interno inválido.');
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}
function normalizeRegister(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  if (!partial || has('code')) {
    const code = String(input?.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,50}$/.test(code)) throw new HttpError(400, 'INVALID_REGISTER_CODE', 'Código do caixa deve possuir de 2 a 50 caracteres (letras, números, _ ou -).');
    out.code = code;
  }
  if (!partial || has('name')) {
    const name = String(input?.name ?? '').trim();
    if (name.length < 2 || name.length > 120) throw new HttpError(400, 'INVALID_REGISTER_NAME', 'Nome do caixa deve possuir entre 2 e 120 caracteres.');
    out.name = name;
  }
  if (!partial || has('isActive')) {
    const value = has('isActive') ? input.isActive : true;
    if (![true, false, 1, 0, '1', '0', 'true', 'false'].includes(value)) throw new HttpError(400, 'INVALID_BOOLEAN', 'Status do caixa inválido.');
    out.isActive = value === true || value === 1 || value === '1' || value === 'true';
  }
  return out;
}
function normalizeOpenSession(input) {
  return {
    cashRegisterId: parsePositiveId(input?.cashRegisterId, 'Caixa'),
    openingBalance: centsToMoney(moneyToCents(input?.openingBalance ?? '0.00', { label: 'Saldo inicial' })),
    notes: normalizeNotes(input?.notes, 2000),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeCloseSession(input) {
  return {
    declaredClosingBalance: centsToMoney(moneyToCents(input?.declaredClosingBalance, { label: 'Saldo declarado' })),
    notes: normalizeNotes(input?.notes, 2000),
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizeNotes(value, max = 500) {
  const v = text(value);
  if (v && v.length > max) throw new HttpError(400, 'INVALID_NOTES', `Observações excedem ${max} caracteres.`);
  return v;
}
function normalizeManualCashMovement(input) {
  const typeCode = String(input?.typeCode ?? '').trim().toUpperCase();
  if (!['CASH_SUPPLY', 'CASH_WITHDRAWAL'].includes(typeCode)) throw new HttpError(400, 'INVALID_CASH_MOVEMENT_TYPE', 'Movimento manual de caixa inválido.');
  const reason = String(input?.reason ?? '').trim();
  if (reason.length < 5 || reason.length > 500) throw new HttpError(400, 'INVALID_CASH_REASON', 'Informe um motivo entre 5 e 500 caracteres.');
  return {
    typeCode,
    amount: centsToMoney(moneyToCents(input?.amount, { allowZero: false, label: 'Valor do movimento' })),
    reason,
    operationKey: normalizeOperationKey(input?.operationKey)
  };
}
function normalizePaymentRequest(input) {
  const payments = Array.isArray(input?.payments) ? input.payments : [];
  if (payments.length < 1 || payments.length > 8) throw new HttpError(400, 'INVALID_PAYMENTS', 'Informe de 1 a 8 formas de pagamento.');
  return {
    operationKey: normalizeOperationKey(input?.operationKey),
    cashSessionId: input?.cashSessionId ? parsePositiveId(input.cashSessionId, 'Sessão de caixa') : null,
    payments: payments.map((item) => {
      const installments = Number(item?.installments ?? 1);
      if (!Number.isSafeInteger(installments) || installments < 1 || installments > 12) throw new HttpError(400, 'INVALID_INSTALLMENTS', 'Parcelas devem ficar entre 1 e 12.');
      return {
        paymentMethodId: parsePositiveId(item?.paymentMethodId, 'Forma de pagamento'),
        amount: centsToMoney(moneyToCents(item?.amount, { allowZero: false, label: 'Valor do pagamento' })),
        installments,
        notes: normalizeNotes(item?.notes, 500)
      };
    })
  };
}
function sumMoney(values) { return values.reduce((total, value) => total + moneyToCents(value), 0); }
function splitInstallments(amount, count) {
  const total = moneyToCents(amount, { allowZero: false });
  const base = Math.floor(total / count);
  let remainder = total % count;
  return Array.from({ length: count }, () => centsToMoney(base + (remainder-- > 0 ? 1 : 0)));
}
function addMonths(dateString, months) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}
function derivedKey(base, ...parts) {
  return crypto.createHash('sha256').update([base, ...parts].join(':')).digest('hex').slice(0, 64);
}
function normalizeDate(value) {
  const v = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(500, 'INVALID_INTERNAL_DATE', 'Data interna inválida.');
  return v;
}

module.exports = {
  addMonths,
  centsToMoney,
  derivedKey,
  moneyToCents,
  normalizeCloseSession,
  normalizeDate,
  normalizeManualCashMovement,
  normalizeOpenSession,
  normalizeOperationKey,
  normalizePaymentRequest,
  normalizeRegister,
  parsePositiveId,
  splitInstallments,
  sumMoney
};
