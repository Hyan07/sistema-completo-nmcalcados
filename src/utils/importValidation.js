'use strict';

const crypto = require('crypto');
const { HttpError } = require('./httpError');
const { normalizeCustomerInput } = require('./customerValidation');
const { normalizeSupplierInput } = require('./supplierValidation');
const { normalizeProductInput, normalizeText, slugify, validateProductBusinessRules } = require('./catalogValidation');
const { normalizeColorInput, normalizeSizeInput, normalizeSkuInput, validateEffectiveSkuPrices } = require('./gradeValidation');
const { HEADER_ALIASES, getDefinition } = require('../config/importDefinitions');

function hashBuffer(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function hashText(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function normalizeOperationKey(value, label = 'Chave da operação') {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{16,64}$/.test(key)) throw new HttpError(400, 'INVALID_IMPORT_OPERATION_KEY', `${label} deve possuir de 16 a 64 caracteres seguros.`);
  return key;
}
function normalizeImportType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!getDefinition(type)) throw new HttpError(400, 'INVALID_IMPORT_TYPE', 'Tipo de importação inválido.');
  return type;
}
function normalizeHeaders(headers) {
  const mapped = headers.map((header) => HEADER_ALIASES[header] || header);
  const duplicates = mapped.filter((header, index) => mapped.indexOf(header) !== index);
  if (duplicates.length) throw new HttpError(400, 'IMPORT_HEADER_DUPLICATE', `As colunas informadas resultam em duplicidade: ${duplicates[0]}.`);
  return mapped;
}
function remapRows(parsed) {
  const headers = normalizeHeaders(parsed.headers);
  return {
    ...parsed,
    headers,
    rows: parsed.rows.map((row) => {
      const data = {};
      parsed.headers.forEach((original, index) => { data[headers[index]] = row.data[original]; });
      return { rowNumber: row.rowNumber, data };
    })
  };
}
function requireHeaders(type, headers) {
  const def = getDefinition(type);
  const missing = def.required.filter((column) => !headers.includes(column));
  if (missing.length) throw new HttpError(400, 'IMPORT_HEADERS_MISSING', `Colunas obrigatórias ausentes: ${missing.join(', ')}.`);
}
function text(value, max, label, { required = false } = {}) {
  const normalized = normalizeText(value);
  if (required && !normalized) throw new HttpError(400, 'IMPORT_FIELD_REQUIRED', `${label} é obrigatório.`);
  if (normalized.length > max) throw new HttpError(400, 'IMPORT_FIELD_TOO_LONG', `${label} excede ${max} caracteres.`);
  return normalized || null;
}
function parseImportBoolean(value, defaultValue = true) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  if (['1','true','sim','s','yes','y','ativo'].includes(raw)) return true;
  if (['0','false','nao','não','n','no','inativo'].includes(raw)) return false;
  throw new HttpError(400, 'IMPORT_BOOLEAN_INVALID', `Valor booleano inválido: ${String(value).slice(0, 30)}.`);
}
function parseInteger(value, label, { min = 0, max = 1000000, defaultValue = 0 } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return defaultValue;
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new HttpError(400, 'IMPORT_INTEGER_INVALID', `${label} deve ser inteiro entre ${min} e ${max}.`);
  return number;
}
function parseImportMoney(value, label, { nullable = false, defaultValue = '0.00' } = {}) {
  let raw = String(value ?? '').trim();
  if (!raw) return nullable ? null : defaultValue;
  raw = raw.replace(/R\$/gi, '').replace(/\s/g, '');
  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) raw = raw.replace(/\./g, '').replace(',', '.');
    else raw = raw.replace(/,/g, '');
  } else if (raw.includes(',')) raw = raw.replace(',', '.');
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(raw)) throw new HttpError(400, 'IMPORT_MONEY_INVALID', `${label} inválido.`);
  return Number(raw).toFixed(2);
}
function normalizeCatalogRow(row) {
  const d = row.data;
  const product = normalizeProductInput({
    categoryId: null, brandId: null,
    internalCode: d.internal_code,
    name: d.name,
    description: d.description,
    model: d.model,
    audience: d.audience,
    collectionName: d.collection_name,
    material: d.material,
    baseCostPrice: parseImportMoney(d.base_cost_price, 'Preço de custo', { defaultValue: '0.00' }),
    baseSalePrice: parseImportMoney(d.base_sale_price, 'Preço de venda'),
    promotionalPrice: parseImportMoney(d.promotional_price, 'Preço promocional', { nullable: true }),
    isActive: true,
    isFeatured: false,
    isCatalogVisible: parseImportBoolean(d.is_catalog_visible, false)
  });
  validateProductBusinessRules(product);
  const categoryName = text(d.category, 120, 'Categoria');
  const brandName = text(d.brand, 120, 'Marca');
  const color = normalizeColorInput({ name: text(d.color, 80, 'Cor', { required: true }), hexCode: d.color_hex, isActive: true });
  const size = normalizeSizeInput({ label: text(d.size, 30, 'Tamanho', { required: true }), sortOrder: parseInteger(d.size_sort_order, 'Ordem do tamanho', { min: -100000, max: 100000, defaultValue: 0 }), isActive: true });
  const sku = normalizeSkuInput({
    sizeId: 1,
    sku: d.sku,
    barcode: d.barcode,
    costPrice: parseImportMoney(d.cost_price, 'Custo do SKU', { nullable: true }),
    salePrice: parseImportMoney(d.sale_price, 'Venda do SKU', { nullable: true }),
    promotionalPrice: parseImportMoney(d.sku_promotional_price, 'Promoção do SKU', { nullable: true }),
    minimumStock: parseInteger(d.minimum_stock, 'Estoque mínimo', { min: 0, max: 1000000, defaultValue: 0 }),
    isActive: true
  });
  validateEffectiveSkuPrices(sku, { base_sale_price: product.baseSalePrice });
  return {
    rowNumber: row.rowNumber,
    product,
    category: categoryName ? { name: categoryName, slug: slugify(categoryName) } : null,
    brand: brandName ? { name: brandName, slug: slugify(brandName) } : null,
    color,
    size,
    sku: { ...sku, sizeId: undefined }
  };
}
function normalizeCustomerRow(row) {
  const d = row.data;
  return { rowNumber: row.rowNumber, customer: normalizeCustomerInput({
    name: d.name, document: d.document, phone: d.phone, whatsapp: d.whatsapp, email: d.email,
    birthDate: d.birth_date, postalCode: d.postal_code, street: d.street, streetNumber: d.street_number,
    addressComplement: d.address_complement, neighborhood: d.neighborhood, city: d.city, state: d.state,
    notes: d.notes, isActive: parseImportBoolean(d.is_active, true)
  }) };
}
function normalizeSupplierRow(row) {
  const d = row.data;
  return { rowNumber: row.rowNumber, supplier: normalizeSupplierInput({
    legalName: d.legal_name, tradeName: d.trade_name, document: d.document, contactName: d.contact_name,
    phone: d.phone, whatsapp: d.whatsapp, email: d.email, postalCode: d.postal_code, street: d.street,
    streetNumber: d.street_number, addressComplement: d.address_complement, neighborhood: d.neighborhood,
    city: d.city, state: d.state, notes: d.notes, isActive: parseImportBoolean(d.is_active, true)
  }) };
}
function normalizeOpeningStockRow(row) {
  const sku = String(row.data.sku || '').trim().toUpperCase();
  if (!/^[A-Z0-9._-]{2,100}$/.test(sku)) throw new HttpError(400, 'INVALID_SKU', 'SKU inválido.');
  const quantity = parseInteger(row.data.quantity, 'Quantidade', { min: 1, max: 1000000, defaultValue: -1 });
  const reason = text(row.data.reason, 500, 'Motivo') || 'Saldo inicial da implantação';
  return { rowNumber: row.rowNumber, sku, quantity, reason };
}
function errorForRow(rowNumber, error) {
  return { row: rowNumber, code: String(error.code || 'IMPORT_ROW_INVALID').slice(0, 80), message: String(error.message || 'Linha inválida.').slice(0, 300) };
}
function normalizeRows(type, parsed) {
  const remapped = remapRows(parsed);
  requireHeaders(type, remapped.headers);
  const normalizer = { catalog: normalizeCatalogRow, customers: normalizeCustomerRow, suppliers: normalizeSupplierRow, opening_stock: normalizeOpeningStockRow }[type];
  const valid = [], errors = [];
  for (const row of remapped.rows) {
    try { valid.push(normalizer(row)); }
    catch (error) { errors.push(errorForRow(row.rowNumber, error)); }
  }
  return { parsed: remapped, valid, errors };
}
function ensureUniqueRows(type, rows, errors) {
  const maps = {};
  const check = (key, value, rowNumber, label) => {
    if (!value) return;
    const normalized = String(value).toLowerCase();
    maps[key] ||= new Map();
    if (maps[key].has(normalized)) errors.push({ row: rowNumber, code: 'IMPORT_DUPLICATE_IN_FILE', message: `${label} repetido no arquivo (primeira ocorrência na linha ${maps[key].get(normalized)}).` });
    else maps[key].set(normalized, rowNumber);
  };
  if (type === 'catalog') {
    const productSignatures = new Map();
    const colorDefinitions = new Map(), sizeDefinitions = new Map();
    for (const row of rows) {
      check('sku', row.sku.sku, row.rowNumber, 'SKU');
      check('barcode', row.sku.barcode, row.rowNumber, 'Código de barras');
      check('grade', `${row.product.internalCode}|${row.color.name}|${row.size.label}`, row.rowNumber, 'Combinação produto/cor/tamanho');
      const signature = JSON.stringify({ product: row.product, category: row.category?.name || null, brand: row.brand?.name || null });
      const previous = productSignatures.get(row.product.internalCode);
      if (previous && previous.signature !== signature) errors.push({ row: row.rowNumber, code: 'IMPORT_PRODUCT_INCONSISTENT', message: `Dados do produto ${row.product.internalCode} divergem da linha ${previous.row}.` });
      else if (!previous) productSignatures.set(row.product.internalCode, { signature, row: row.rowNumber });
      const colorKey = row.color.name.toLowerCase(), colorSig = row.color.hexCode || '';
      const oldColor = colorDefinitions.get(colorKey);
      if (oldColor && oldColor.signature !== colorSig) errors.push({ row: row.rowNumber, code: 'IMPORT_COLOR_INCONSISTENT', message: `Definição da cor ${row.color.name} diverge da linha ${oldColor.row}.` });
      else if (!oldColor) colorDefinitions.set(colorKey, { signature: colorSig, row: row.rowNumber });
      const sizeKey = row.size.label.toLowerCase(), sizeSig = String(row.size.sortOrder);
      const oldSize = sizeDefinitions.get(sizeKey);
      if (oldSize && oldSize.signature !== sizeSig) errors.push({ row: row.rowNumber, code: 'IMPORT_SIZE_INCONSISTENT', message: `Ordem do tamanho ${row.size.label} diverge da linha ${oldSize.row}.` });
      else if (!oldSize) sizeDefinitions.set(sizeKey, { signature: sizeSig, row: row.rowNumber });
    }
  } else if (type === 'customers') {
    for (const row of rows) check('document', row.customer.document, row.rowNumber, 'CPF/CNPJ');
  } else if (type === 'suppliers') {
    for (const row of rows) check('document', row.supplier.document, row.rowNumber, 'CPF/CNPJ');
  } else if (type === 'opening_stock') {
    for (const row of rows) check('sku', row.sku, row.rowNumber, 'SKU');
  }
}

module.exports = {
  errorForRow, hashBuffer, hashText, normalizeHeaders, normalizeImportType, normalizeOperationKey,
  normalizeRows, ensureUniqueRows, parseImportBoolean, parseImportMoney, parseInteger
};
