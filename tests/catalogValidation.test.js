'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, normalizeProductInput, validateProductBusinessRules } = require('../src/utils/catalogValidation');

test('slugify remove acentos e normaliza separadores', () => {
  assert.equal(slugify('Tênis Casual Feminino'), 'tenis-casual-feminino');
});

test('produto rejeita promoção maior que venda', () => {
  const product = normalizeProductInput({ internalCode: 'abc-1', name: 'Produto teste', baseCostPrice: '50', baseSalePrice: '100', promotionalPrice: '120', isActive: true, isFeatured: false, isCatalogVisible: false });
  assert.throws(() => validateProductBusinessRules(product), /promocional/i);
});

test('produto visível no catálogo precisa preço e status ativo', () => {
  const product = normalizeProductInput({ internalCode: 'abc-2', name: 'Produto teste', baseCostPrice: '0', baseSalePrice: '0', isActive: true, isFeatured: false, isCatalogVisible: true });
  assert.throws(() => validateProductBusinessRules(product), /catálogo/i);
});
