'use strict';

const { HttpError } = require('./httpError');

function digits(value) { return String(value ?? '').replace(/\D/g, ''); }
function text(value) { const v = String(value ?? '').trim(); return v || null; }
function requireText(value, min, max, label) {
  const v = String(value ?? '').trim();
  if (v.length < min || v.length > max) throw new HttpError(400, 'INVALID_CUSTOMER_FIELD', `${label} deve possuir entre ${min} e ${max} caracteres.`);
  return v;
}
function optionalText(value, max, label) {
  const v = text(value);
  if (v && v.length > max) throw new HttpError(400, 'INVALID_CUSTOMER_FIELD', `${label} excede ${max} caracteres.`);
  return v;
}
function isRepeated(value) { return /^(\d)\1+$/.test(value); }
function isValidCpf(value) {
  const cpf = digits(value);
  if (cpf.length !== 11 || isRepeated(cpf)) return false;
  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let i = 0; i < digit; i += 1) sum += Number(cpf[i]) * ((digit + 1) - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(cpf[digit])) return false;
  }
  return true;
}
function isValidCnpj(value) {
  const cnpj = digits(value);
  if (cnpj.length !== 14 || isRepeated(cnpj)) return false;
  const calc = (length) => {
    const weights = length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
function normalizeDocument(value) {
  const document = digits(value);
  if (!document) return null;
  if (document.length === 11 && isValidCpf(document)) return document;
  if (document.length === 14 && isValidCnpj(document)) return document;
  throw new HttpError(400, 'INVALID_DOCUMENT', 'Documento deve ser um CPF ou CNPJ válido.');
}
function normalizePhone(value, label) {
  const phone = digits(value);
  if (!phone) return null;
  if (phone.length < 10 || phone.length > 15) throw new HttpError(400, 'INVALID_PHONE', `${label} deve possuir entre 10 e 15 dígitos.`);
  return phone;
}
function normalizeEmail(value) {
  const email = text(value)?.toLowerCase() || null;
  if (!email) return null;
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'INVALID_EMAIL', 'E-mail inválido.');
  return email;
}
function normalizeBirthDate(value) {
  const birthDate = text(value);
  if (!birthDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpError(400, 'INVALID_BIRTH_DATE', 'Data de nascimento inválida.');
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate || date.getTime() > Date.now()) {
    throw new HttpError(400, 'INVALID_BIRTH_DATE', 'Data de nascimento inválida.');
  }
  return birthDate;
}
function normalizePostalCode(value) {
  const postalCode = digits(value);
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
function parseBoolean(value, label = 'Status') {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  throw new HttpError(400, 'INVALID_BOOLEAN', `${label} inválido.`);
}
function normalizeCustomerInput(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  if (!partial || has('name')) out.name = requireText(input?.name, 2, 180, 'Nome');
  if (!partial || has('document')) out.document = normalizeDocument(input?.document);
  if (!partial || has('phone')) out.phone = normalizePhone(input?.phone, 'Telefone');
  if (!partial || has('whatsapp')) out.whatsapp = normalizePhone(input?.whatsapp, 'WhatsApp');
  if (!partial || has('email')) out.email = normalizeEmail(input?.email);
  if (!partial || has('birthDate')) out.birthDate = normalizeBirthDate(input?.birthDate);
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
function parsePagination(query = {}) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  if (!Number.isSafeInteger(page) || page < 1) throw new HttpError(400, 'INVALID_PAGE', 'Página inválida.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new HttpError(400, 'INVALID_PAGE_SIZE', 'pageSize deve ficar entre 1 e 100.');
  return { page, pageSize, offset: (page - 1) * pageSize };
}
function maskDocument(value) {
  const doc = digits(value);
  if (doc.length === 11) return `***.***.${doc.slice(6, 9)}-${doc.slice(9)}`;
  if (doc.length === 14) return `**.***.***/${doc.slice(8, 12)}-${doc.slice(12)}`;
  return null;
}

module.exports = {
  isValidCpf, isValidCnpj, maskDocument, normalizeCustomerInput, normalizeDocument,
  normalizeEmail, normalizePhone, parseBoolean, parsePagination
};
