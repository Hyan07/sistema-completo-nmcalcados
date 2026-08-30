'use strict';

const { HttpError } = require('./httpError');
const {
  maskDocument,
  normalizeDocument,
  normalizeEmail,
  normalizePhone,
  parseBoolean,
  parsePagination
} = require('./customerValidation');

function text(value) { const v = String(value ?? '').trim(); return v || null; }
function requiredText(value, min, max, label) {
  const v = String(value ?? '').trim();
  if (v.length < min || v.length > max) throw new HttpError(400, 'INVALID_SUPPLIER_FIELD', `${label} deve possuir entre ${min} e ${max} caracteres.`);
  return v;
}
function optionalText(value, max, label) {
  const v = text(value);
  if (v && v.length > max) throw new HttpError(400, 'INVALID_SUPPLIER_FIELD', `${label} excede ${max} caracteres.`);
  return v;
}
function normalizePostalCode(value) {
  const postalCode = String(value ?? '').replace(/\D/g, '');
  if (!postalCode) return null;
  if (postalCode.length !== 8) throw new HttpError(400, 'INVALID_POSTAL_CODE', 'CEP deve possuir 8 dígitos.');
  return postalCode;
}
function normalizeState(value) {
  const state = text(value)?.toUpperCase() || null;
  if (!state) return null;
  if (!/^[A-Z]{2}$/.test(state)) throw new HttpError(400, 'INVALID_STATE', 'UF deve possuir duas letras.');
  return state;
}
function normalizeSupplierInput(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  if (!partial || has('legalName')) out.legalName = requiredText(input?.legalName, 2, 180, 'Razão social/nome');
  if (!partial || has('tradeName')) out.tradeName = optionalText(input?.tradeName, 180, 'Nome fantasia');
  if (!partial || has('document')) out.document = normalizeDocument(input?.document);
  if (!partial || has('contactName')) out.contactName = optionalText(input?.contactName, 150, 'Contato');
  if (!partial || has('phone')) out.phone = normalizePhone(input?.phone, 'Telefone');
  if (!partial || has('whatsapp')) out.whatsapp = normalizePhone(input?.whatsapp, 'WhatsApp');
  if (!partial || has('email')) out.email = normalizeEmail(input?.email);
  if (!partial || has('postalCode')) out.postalCode = normalizePostalCode(input?.postalCode);
  if (!partial || has('street')) out.street = optionalText(input?.street, 180, 'Logradouro');
  if (!partial || has('streetNumber')) out.streetNumber = optionalText(input?.streetNumber, 30, 'Número');
  if (!partial || has('addressComplement')) out.addressComplement = optionalText(input?.addressComplement, 100, 'Complemento');
  if (!partial || has('neighborhood')) out.neighborhood = optionalText(input?.neighborhood, 120, 'Bairro');
  if (!partial || has('city')) out.city = optionalText(input?.city, 120, 'Cidade');
  if (!partial || has('state')) out.state = normalizeState(input?.state);
  if (!partial || has('notes')) out.notes = optionalText(input?.notes, 5000, 'Observações');
  if (!partial || has('isActive')) out.isActive = has('isActive') ? parseBoolean(input.isActive) : true;
  return out;
}

module.exports = { maskDocument, normalizeSupplierInput, parseBoolean, parsePagination };
