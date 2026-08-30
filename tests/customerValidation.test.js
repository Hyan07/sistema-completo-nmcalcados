'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidCpf, isValidCnpj, maskDocument, normalizeCustomerInput, normalizeDocument } = require('../src/utils/customerValidation');

test('valida CPF', () => {
  assert.equal(isValidCpf('987.654.321-00'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(normalizeDocument('987.654.321-00'), '98765432100');
});
test('valida CNPJ', () => {
  assert.equal(isValidCnpj('12.345.678/0001-95'), true);
  assert.equal(isValidCnpj('00.000.000/0000-00'), false);
});
test('normaliza cliente e contatos', () => {
  const c = normalizeCustomerInput({ name:' Maria Silva ', phone:'(35) 99999-9999', whatsapp:'35 98888-8888', email:'MARIA@EXAMPLE.COM', postalCode:'37900-000' });
  assert.equal(c.name, 'Maria Silva');
  assert.equal(c.phone, '35999999999');
  assert.equal(c.email, 'maria@example.com');
  assert.equal(c.postalCode, '37900000');
  assert.equal(c.isActive, true);
});
test('rejeita documento inválido', () => {
  assert.throws(() => normalizeDocument('123.456.789-00'), /CPF ou CNPJ válido/);
});
test('mascara documento para listas', () => {
  assert.equal(maskDocument('98765432100'), '***.***.321-00');
  assert.equal(maskDocument('12345678000195'), '**.***.***/0001-95');
});
