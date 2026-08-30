'use strict';

const crypto = require('crypto');
const repository = require('../repositories/importRepository');
const stockService = require('./stockService');
const { HttpError } = require('../utils/httpError');

async function ensureCategory(value, cache, connection) {
  if (!value) return { id: null, created: false };
  const key = value.slug.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const row = await repository.findCategoryBySlug(value.slug, connection);
  const result = { id: row ? Number(row.id) : Number(await repository.insertCategory(value, connection)), created: !row };
  cache.set(key, result); return result;
}
async function ensureBrand(value, cache, connection) {
  if (!value) return { id: null, created: false };
  const key = value.slug.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const row = await repository.findBrandBySlug(value.slug, connection);
  const result = { id: row ? Number(row.id) : Number(await repository.insertBrand(value, connection)), created: !row };
  cache.set(key, result); return result;
}
async function ensureColor(value, cache, connection) {
  const key = value.name.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const row = await repository.findColorByName(value.name, connection);
  const result = { id: row ? Number(row.id) : Number(await repository.insertColor(value, connection)), created: !row };
  cache.set(key, result); return result;
}
async function ensureSize(value, cache, connection) {
  const key = value.label.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const row = await repository.findSizeByLabel(value.label, connection);
  const result = { id: row ? Number(row.id) : Number(await repository.insertSize(value, connection)), created: !row };
  cache.set(key, result); return result;
}
async function applyCatalog(rows, actorId, connection) {
  const categoryCache = new Map(), brandCache = new Map(), colorCache = new Map(), sizeCache = new Map(), productCache = new Map(), variantCache = new Map();
  const summary = { products: 0, variants: 0, skus: 0, categoriesCreated: 0, brandsCreated: 0, colorsCreated: 0, sizesCreated: 0 };
  for (const row of rows) {
    const category = await ensureCategory(row.category, categoryCache, connection), brand = await ensureBrand(row.brand, brandCache, connection);
    if (category.created) summary.categoriesCreated += 1; if (brand.created) summary.brandsCreated += 1;
    let productId = productCache.get(row.product.internalCode);
    if (!productId) { productId = Number(await repository.insertProduct(row.product, category.id, brand.id, connection)); productCache.set(row.product.internalCode, productId); summary.products += 1; }
    const color = await ensureColor(row.color, colorCache, connection), size = await ensureSize(row.size, sizeCache, connection);
    if (color.created) summary.colorsCreated += 1; if (size.created) summary.sizesCreated += 1;
    const variantKey = `${productId}:${color.id}`; let variantId = variantCache.get(variantKey);
    if (!variantId) { const existingVariant = await repository.findVariant(productId, color.id, connection); variantId = existingVariant ? Number(existingVariant.id) : Number(await repository.insertVariant(productId, color.id, connection)); variantCache.set(variantKey, variantId); if (!existingVariant) summary.variants += 1; }
    await repository.insertSku(row.sku, variantId, size.id, connection); summary.skus += 1;
  }
  return summary;
}
async function applyCustomers(rows, actorId, connection) { for (const row of rows) await repository.insertCustomer(row.customer, actorId, connection); return { customers: rows.length }; }
async function applySuppliers(rows, actorId, connection) { for (const row of rows) await repository.insertSupplier(row.supplier, actorId, connection); return { suppliers: rows.length }; }
function stockOperationKey(applyOperationKey, row) { return crypto.createHash('sha256').update(`${applyOperationKey}:opening-stock:${row.rowNumber}:${row.sku}`).digest('hex'); }
async function applyOpeningStock(rows, actorId, applyOperationKey, connection) {
  let movements = 0, units = 0;
  for (const row of rows) {
    const sku = await repository.findSkuByCode(row.sku, connection);
    if (!sku) throw new HttpError(409, 'IMPORT_CONTEXT_CHANGED', `SKU ${row.sku} deixou de existir durante a importação.`);
    await stockService.applyStockMovement({ skuId: sku.id, userId: actorId, typeCode: 'INITIAL_BALANCE', quantity: row.quantity, reason: row.reason, operationKey: stockOperationKey(applyOperationKey, row) }, { connection });
    movements += 1; units += row.quantity;
  }
  return { stockMovements: movements, unitsImported: units };
}
async function applyRows(type, rows, actorId, applyOperationKey, connection) {
  if (type === 'catalog') return applyCatalog(rows, actorId, connection);
  if (type === 'customers') return applyCustomers(rows, actorId, connection);
  if (type === 'suppliers') return applySuppliers(rows, actorId, connection);
  if (type === 'opening_stock') return applyOpeningStock(rows, actorId, applyOperationKey, connection);
  throw new HttpError(500, 'IMPORT_TYPE_UNSUPPORTED', 'Tipo de importação não suportado.');
}
module.exports = { applyRows, stockOperationKey };
