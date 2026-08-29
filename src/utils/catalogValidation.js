'use strict';

const { HttpError } = require('./httpError');

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function slugify(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

function normalizeInternalCode(value) {
  return normalizeText(value).toUpperCase();
}

function optionalId(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_REFERENCE', `${fieldName} inválido.`);
  }
  return parsed;
}

function parseBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new HttpError(400, 'INVALID_BOOLEAN', `${fieldName} deve ser booleano.`);
  }
  return value;
}

function normalizeMoney(value, { nullable = false, fieldName = 'Valor' } = {}) {
  if ((value === undefined || value === null || value === '') && nullable) return null;
  const raw = String(value ?? '').trim();
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(raw)) {
    throw new HttpError(400, 'INVALID_MONEY', `${fieldName} inválido. Use até 2 casas decimais.`);
  }
  return Number(raw).toFixed(2);
}

function moneyToCents(value) {
  if (value === null || value === undefined) return null;
  const [integer, decimals = ''] = String(value).split('.');
  return (BigInt(integer) * 100n) + BigInt((decimals + '00').slice(0, 2));
}

function validateLength(value, min, max, fieldName, { nullable = false } = {}) {
  const text = normalizeText(value);
  if (nullable && !text) return null;
  if (text.length < min || text.length > max) {
    throw new HttpError(400, 'INVALID_TEXT', `${fieldName} deve ter entre ${min} e ${max} caracteres.`);
  }
  return text;
}

function normalizeProductInput(input, { partial = false } = {}) {
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);
  const put = (key, fn) => {
    if (!partial || has(key)) out[key] = fn();
  };

  put('categoryId', () => optionalId(input.categoryId, 'Categoria'));
  put('brandId', () => optionalId(input.brandId, 'Marca'));
  put('internalCode', () => {
    const code = normalizeInternalCode(input.internalCode);
    if (code.length < 2 || code.length > 80) throw new HttpError(400, 'INVALID_INTERNAL_CODE', 'Código interno deve ter entre 2 e 80 caracteres.');
    return code;
  });
  put('name', () => validateLength(input.name, 2, 180, 'Nome'));
  put('description', () => {
    const value = String(input.description ?? '').trim();
    if (value.length > 10000) throw new HttpError(400, 'INVALID_DESCRIPTION', 'Descrição excede 10.000 caracteres.');
    return value || null;
  });
  for (const [key, label, max] of [
    ['model', 'Modelo', 120], ['audience', 'Público', 80], ['collectionName', 'Coleção', 120], ['material', 'Material', 120]
  ]) {
    put(key, () => validateLength(input[key], 1, max, label, { nullable: true }));
  }
  put('baseCostPrice', () => normalizeMoney(input.baseCostPrice ?? '0', { fieldName: 'Preço de custo' }));
  put('baseSalePrice', () => normalizeMoney(input.baseSalePrice ?? '0', { fieldName: 'Preço de venda' }));
  put('promotionalPrice', () => normalizeMoney(input.promotionalPrice, { nullable: true, fieldName: 'Preço promocional' }));
  put('isActive', () => parseBoolean(input.isActive ?? true, 'isActive'));
  put('isFeatured', () => parseBoolean(input.isFeatured ?? false, 'isFeatured'));
  put('isCatalogVisible', () => parseBoolean(input.isCatalogVisible ?? false, 'isCatalogVisible'));

  return out;
}

function validateProductBusinessRules(product) {
  const sale = moneyToCents(product.baseSalePrice);
  const promo = moneyToCents(product.promotionalPrice);
  if (promo !== null && sale !== null && promo > sale) {
    throw new HttpError(400, 'INVALID_PROMOTIONAL_PRICE', 'Preço promocional não pode ser maior que o preço de venda.');
  }
  if (product.isCatalogVisible && (!product.isActive || sale === 0n)) {
    throw new HttpError(400, 'CATALOG_PRODUCT_INVALID', 'Produto visível no catálogo deve estar ativo e possuir preço de venda maior que zero.');
  }
}

function parsePagination(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 20);
  if (!Number.isSafeInteger(page) || page < 1) throw new HttpError(400, 'INVALID_PAGE', 'Página inválida.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new HttpError(400, 'INVALID_PAGE_SIZE', 'pageSize deve estar entre 1 e 100.');
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = {
  moneyToCents,
  normalizeInternalCode,
  normalizeMoney,
  normalizeProductInput,
  normalizeText,
  optionalId,
  parseBoolean,
  parsePagination,
  slugify,
  validateLength,
  validateProductBusinessRules
};
