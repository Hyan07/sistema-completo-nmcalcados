'use strict';

const repository = require('../repositories/importRepository');
const { parseCsv } = require('../utils/importCsv');
const { ensureUniqueRows, normalizeRows } = require('../utils/importValidation');

const ERROR_STORE_LIMIT = 500;
function addError(errors, row, code, message) { errors.push({ row, code, message }); }

async function validateAgainstDatabase(type, rows, errors, connection = null) {
  if (type === 'catalog') {
    const productRows = await repository.findProductsByCodes([...new Set(rows.map((r) => r.product.internalCode))], connection);
    const existingProducts = new Set(productRows.map((r) => String(r.internal_code).toUpperCase()));
    const skuRows = await repository.findSkusByCodes(rows.map((r) => r.sku.sku), connection);
    const existingSkus = new Set(skuRows.map((r) => String(r.sku).toUpperCase()));
    const barcodeRows = await repository.findSkusByBarcodes(rows.map((r) => r.sku.barcode).filter(Boolean), connection);
    const existingBarcodes = new Set(barcodeRows.map((r) => String(r.barcode)));
    const categories = await repository.findCategoriesBySlugs(rows.map((r) => r.category?.slug).filter(Boolean), connection);
    const categoryMap = new Map(categories.map((r) => [String(r.slug).toLowerCase(), r]));
    const brands = await repository.findBrandsBySlugs(rows.map((r) => r.brand?.slug).filter(Boolean), connection);
    const brandMap = new Map(brands.map((r) => [String(r.slug).toLowerCase(), r]));
    const colors = await repository.findColorsByNames(rows.map((r) => r.color.name), connection);
    const colorMap = new Map(colors.map((r) => [String(r.name).toLowerCase(), r]));
    const sizes = await repository.findSizesByLabels(rows.map((r) => r.size.label), connection);
    const sizeMap = new Map(sizes.map((r) => [String(r.label).toLowerCase(), r]));
    for (const row of rows) {
      if (existingProducts.has(row.product.internalCode)) addError(errors, row.rowNumber, 'IMPORT_PRODUCT_EXISTS', `O código interno ${row.product.internalCode} já existe. A importação não sobrescreve produtos.`);
      if (existingSkus.has(row.sku.sku)) addError(errors, row.rowNumber, 'IMPORT_SKU_EXISTS', `O SKU ${row.sku.sku} já existe.`);
      if (row.sku.barcode && existingBarcodes.has(row.sku.barcode)) addError(errors, row.rowNumber, 'IMPORT_BARCODE_EXISTS', 'O código de barras desta linha já existe em outro SKU.');
      if (row.category) {
        const current = categoryMap.get(row.category.slug.toLowerCase());
        if (current && String(current.name).trim().toLowerCase() !== row.category.name.toLowerCase()) addError(errors, row.rowNumber, 'IMPORT_CATEGORY_SLUG_CONFLICT', 'A categoria gera um slug já usado por outro nome.');
        if (current && !current.is_active) addError(errors, row.rowNumber, 'IMPORT_CATEGORY_INACTIVE', 'A categoria correspondente já existe, mas está inativa.');
      }
      if (row.brand) {
        const current = brandMap.get(row.brand.slug.toLowerCase());
        if (current && String(current.name).trim().toLowerCase() !== row.brand.name.toLowerCase()) addError(errors, row.rowNumber, 'IMPORT_BRAND_SLUG_CONFLICT', 'A marca gera um slug já usado por outro nome.');
        if (current && !current.is_active) addError(errors, row.rowNumber, 'IMPORT_BRAND_INACTIVE', 'A marca correspondente já existe, mas está inativa.');
      }
      const currentColor = colorMap.get(row.color.name.toLowerCase());
      if (currentColor && !currentColor.is_active) addError(errors, row.rowNumber, 'IMPORT_COLOR_INACTIVE', 'A cor correspondente já existe, mas está inativa.');
      if (currentColor && row.color.hexCode && String(currentColor.hex_code || '').toUpperCase() !== row.color.hexCode) addError(errors, row.rowNumber, 'IMPORT_COLOR_HEX_CONFLICT', 'A cor já existe com outro código hexadecimal.');
      const currentSize = sizeMap.get(row.size.label.toLowerCase());
      if (currentSize && !currentSize.is_active) addError(errors, row.rowNumber, 'IMPORT_SIZE_INACTIVE', 'O tamanho correspondente já existe, mas está inativo.');
      if (currentSize && Number(currentSize.sort_order) !== Number(row.size.sortOrder)) addError(errors, row.rowNumber, 'IMPORT_SIZE_ORDER_CONFLICT', 'O tamanho já existe com outra ordem de exibição.');
    }
  } else if (type === 'customers') {
    const existing = await repository.findCustomersByDocuments(rows.map((r) => r.customer.document).filter(Boolean), connection);
    const docs = new Set(existing.map((r) => String(r.document)));
    for (const row of rows) if (row.customer.document && docs.has(row.customer.document)) addError(errors, row.rowNumber, 'IMPORT_CUSTOMER_EXISTS', 'Já existe cliente com o CPF/CNPJ informado.');
  } else if (type === 'suppliers') {
    const existing = await repository.findSuppliersByDocuments(rows.map((r) => r.supplier.document).filter(Boolean), connection);
    const docs = new Set(existing.map((r) => String(r.document)));
    for (const row of rows) if (row.supplier.document && docs.has(row.supplier.document)) addError(errors, row.rowNumber, 'IMPORT_SUPPLIER_EXISTS', 'Já existe fornecedor com o CPF/CNPJ informado.');
  } else if (type === 'opening_stock') {
    const existing = await repository.findOpeningStockSkus(rows.map((r) => r.sku), connection);
    const bySku = new Map(existing.map((r) => [String(r.sku).toUpperCase(), r]));
    for (const row of rows) {
      const current = bySku.get(row.sku);
      if (!current) { addError(errors, row.rowNumber, 'IMPORT_STOCK_SKU_NOT_FOUND', `SKU ${row.sku} não encontrado.`); continue; }
      if (!current.sku_is_active || !current.variant_is_active || !current.product_is_active) addError(errors, row.rowNumber, 'IMPORT_STOCK_SKU_INACTIVE', `SKU ${row.sku} ou seu produto/variante está inativo.`);
      if (Number(current.quantity) !== 0) addError(errors, row.rowNumber, 'IMPORT_STOCK_NOT_ZERO', `SKU ${row.sku} já possui saldo e não aceita saldo inicial.`);
      if (current.has_history) addError(errors, row.rowNumber, 'IMPORT_STOCK_HAS_HISTORY', `SKU ${row.sku} já possui movimentações e não aceita saldo inicial.`);
    }
  }
}

async function inspectFile(type, file, connection = null) {
  const parsed = parseCsv(file.buffer);
  const normalized = normalizeRows(type, parsed);
  const errors = [...normalized.errors];
  ensureUniqueRows(type, normalized.valid, errors);
  await validateAgainstDatabase(type, normalized.valid, errors, connection);
  const invalidRowNumbers = new Set(errors.filter((e) => Number.isInteger(e.row) && e.row >= 2).map((e) => e.row));
  const rowCount = normalized.parsed.rows.length;
  return { rows: normalized.valid, errors, rowCount, invalidRows: invalidRowNumbers.size, validRows: rowCount - invalidRowNumbers.size };
}
function validationSummary(errors) { return { errors: errors.slice(0, ERROR_STORE_LIMIT), totalErrors: errors.length, truncated: errors.length > ERROR_STORE_LIMIT }; }

module.exports = { inspectFile, validateAgainstDatabase, validationSummary };
