'use strict';

const { HttpError } = require('./httpError');

function parsePositiveId(value, label = 'Identificador') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}

function normalizeName(value, label, maxLength) {
  const text = String(value ?? '').trim();
  if (!text || text.length > maxLength) throw new HttpError(400, 'INVALID_FIELD', `${label} deve possuir entre 1 e ${maxLength} caracteres.`);
  return text;
}

function normalizeOptionalText(value, maxLength, label) {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > maxLength) throw new HttpError(400, 'INVALID_FIELD', `${label} excede ${maxLength} caracteres.`);
  return text;
}

function parseBoolean(value, label) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  throw new HttpError(400, 'INVALID_FIELD', `${label} inválido.`);
}

function normalizeHexCode(value) {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return null;
  if (!/^#[0-9A-F]{6}$/.test(text)) throw new HttpError(400, 'INVALID_HEX_COLOR', 'Cor hexadecimal deve usar o formato #RRGGBB.');
  return text;
}

function normalizeColorInput(input, { partial = false } = {}) {
  const data = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'name')) data.name = normalizeName(input.name, 'Nome da cor', 80);
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'hexCode')) data.hexCode = normalizeHexCode(input.hexCode) ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'isActive')) data.isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'Status da cor');
  return data;
}

function normalizeSizeInput(input, { partial = false } = {}) {
  const data = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'label')) data.label = normalizeName(input.label, 'Tamanho', 30);
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'sortOrder')) {
    const raw = input.sortOrder === undefined || input.sortOrder === '' ? 0 : Number(input.sortOrder);
    if (!Number.isSafeInteger(raw) || raw < -100000 || raw > 100000) throw new HttpError(400, 'INVALID_SORT_ORDER', 'Ordem do tamanho inválida.');
    data.sortOrder = raw;
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'isActive')) data.isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'Status do tamanho');
  return data;
}

function normalizeSkuCode(value) {
  const text = String(value ?? '').trim().toUpperCase();
  if (text.length < 2 || text.length > 100 || !/^[A-Z0-9._-]+$/.test(text)) {
    throw new HttpError(400, 'INVALID_SKU', 'SKU deve ter de 2 a 100 caracteres e usar apenas letras, números, ponto, hífen ou underline.');
  }
  return text;
}

function normalizeBarcode(value) {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length < 3 || text.length > 100 || /[\u0000-\u001F\u007F]/.test(text)) {
    throw new HttpError(400, 'INVALID_BARCODE', 'Código de barras deve possuir entre 3 e 100 caracteres válidos.');
  }
  return text;
}

function normalizeMoney(value, label, { nullable = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') {
    if (nullable) return null;
    throw new HttpError(400, 'INVALID_PRICE', `${label} é obrigatório.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 9999999999999.99) throw new HttpError(400, 'INVALID_PRICE', `${label} inválido.`);
  return number.toFixed(2);
}

function normalizeMinimumStock(value) {
  if (value === undefined) return undefined;
  const number = value === '' || value === null ? 0 : Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 1000000) throw new HttpError(400, 'INVALID_MINIMUM_STOCK', 'Estoque mínimo deve ser um inteiro entre 0 e 1.000.000.');
  return number;
}

function normalizeVariantInput(input, { partial = false } = {}) {
  const data = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'colorId')) data.colorId = parsePositiveId(input.colorId, 'Cor');
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'variantName')) data.variantName = normalizeOptionalText(input.variantName, 150, 'Nome da variante') ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'isActive')) data.isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'Status da variante');
  return data;
}

function normalizeSkuInput(input, { partial = false } = {}) {
  const data = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'sizeId')) data.sizeId = parsePositiveId(input.sizeId, 'Tamanho');
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'sku')) data.sku = normalizeSkuCode(input.sku);
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'barcode')) data.barcode = normalizeBarcode(input.barcode) ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'costPrice')) data.costPrice = normalizeMoney(input.costPrice, 'Preço de custo') ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'salePrice')) data.salePrice = normalizeMoney(input.salePrice, 'Preço de venda') ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'promotionalPrice')) data.promotionalPrice = normalizeMoney(input.promotionalPrice, 'Preço promocional') ?? null;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'minimumStock')) data.minimumStock = normalizeMinimumStock(input.minimumStock) ?? 0;
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'isActive')) data.isActive = input.isActive === undefined ? true : parseBoolean(input.isActive, 'Status do SKU');
  return data;
}

function validateEffectiveSkuPrices(data, product) {
  const sale = data.salePrice === null || data.salePrice === undefined ? Number(product.base_sale_price) : Number(data.salePrice);
  const promo = data.promotionalPrice === null || data.promotionalPrice === undefined ? null : Number(data.promotionalPrice);
  if (promo !== null && promo > sale) throw new HttpError(400, 'PROMOTIONAL_PRICE_TOO_HIGH', 'Preço promocional do SKU não pode superar o preço de venda efetivo.');
}

module.exports = {
  normalizeColorInput,
  normalizeSizeInput,
  normalizeSkuInput,
  normalizeVariantInput,
  parsePositiveId,
  validateEffectiveSkuPrices
};
