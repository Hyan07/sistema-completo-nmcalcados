'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUsername, validatePassword, validateUsername } = require('../src/utils/authValidation');

test('normaliza username para minúsculas sem espaços externos', () => { assert.equal(normalizeUsername('  Vendedor.01  '), 'vendedor.01'); });
test('aceita apenas usernames compatíveis com a política', () => {
  assert.equal(validateUsername('admin.nm'), true);
  assert.equal(validateUsername('ab'), false);
  assert.equal(validateUsername('nome com espaço'), false);
});
test('senha exige no mínimo 12 e no máximo 128 caracteres', () => {
  assert.equal(validatePassword('123456789012'), true);
  assert.equal(validatePassword('123456'), false);
  assert.equal(validatePassword('x'.repeat(129)), false);
});
