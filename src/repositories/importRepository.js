'use strict';

const { getPool } = require('../config/database');

function db(connection) { return connection || getPool(); }

async function findBatchById(id, connection = null, { forUpdate = false } = {}) {
  const [rows] = await db(connection).execute(`
    SELECT dib.*, creator.name AS created_by_name, applier.name AS applied_by_name
      FROM data_import_batches dib
      JOIN users creator ON creator.id = dib.created_by_user_id
      LEFT JOIN users applier ON applier.id = dib.applied_by_user_id
     WHERE dib.id = ?${forUpdate ? ' FOR UPDATE' : ''}
     LIMIT 1
  `, [id]);
  return rows[0] || null;
}
async function findBatchForUpdate(id, connection) {
  const [rows] = await connection.execute('SELECT * FROM data_import_batches WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}
async function findBatchByValidationKey(key, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM data_import_batches WHERE validation_operation_key = ? LIMIT 1', [key]);
  return rows[0] || null;
}
async function findBatchByApplyKey(key, connection = null) {
  const [rows] = await db(connection).execute('SELECT * FROM data_import_batches WHERE apply_operation_key = ? LIMIT 1', [key]);
  return rows[0] || null;
}
async function createBatch(data, connection = null) {
  const [result] = await db(connection).execute(`
    INSERT INTO data_import_batches (
      import_type, original_filename, file_sha256, schema_version, status,
      validation_operation_key, row_count, valid_rows, invalid_rows,
      validation_errors, created_by_user_id
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.importType, data.originalFilename, data.fileSha256, data.status,
    data.validationOperationKey, data.rowCount, data.validRows, data.invalidRows,
    data.validationErrors ? JSON.stringify(data.validationErrors) : null, data.userId
  ]);
  return result.insertId;
}
async function markBatchApplied(id, data, connection) {
  await connection.execute(`
    UPDATE data_import_batches
       SET status = 'APPLIED', apply_operation_key = ?, result_summary = ?,
           applied_by_user_id = ?, applied_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?
  `, [data.applyOperationKey, JSON.stringify(data.resultSummary || {}), data.userId, id]);
}
async function markBatchFailed(id, code) {
  await getPool().execute(`UPDATE data_import_batches SET status='FAILED', result_summary=? WHERE id=? AND status<>'APPLIED'`, [JSON.stringify({ errorCode: String(code || 'IMPORT_APPLY_FAILED').slice(0, 80) }), id]);
}
async function listBatches({ page, pageSize, offset, type = null, status = null }) {
  const where = [], params = [];
  if (type) { where.push('dib.import_type=?'); params.push(type); }
  if (status) { where.push('dib.status=?'); params.push(status); }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await getPool().execute(`
    SELECT dib.id,dib.import_type,dib.original_filename,dib.file_sha256,dib.status,dib.row_count,dib.valid_rows,dib.invalid_rows,
           dib.validation_errors,dib.result_summary,dib.created_at,dib.validated_at,dib.applied_at,
           creator.name created_by_name,applier.name applied_by_name
      FROM data_import_batches dib
      JOIN users creator ON creator.id=dib.created_by_user_id
      LEFT JOIN users applier ON applier.id=dib.applied_by_user_id
      ${sql}
     ORDER BY dib.created_at DESC,dib.id DESC LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);
  const [countRows] = await getPool().execute(`SELECT COUNT(*) total FROM data_import_batches dib ${sql}`, params);
  return { rows, total: Number(countRows[0].total) };
}

function placeholders(items) { return items.map(() => '?').join(','); }
async function queryIn(sqlPrefix, values, connection = null, chunkSize = 400) {
  const out = [];
  if (!values.length) return out;
  const unique = [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ''))];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const [rows] = await db(connection).execute(`${sqlPrefix} (${placeholders(chunk)})`, chunk);
    out.push(...rows);
  }
  return out;
}
async function findProductsByCodes(codes, connection = null) {
  return queryIn('SELECT id,internal_code FROM products WHERE internal_code IN', codes, connection);
}
async function findSkusByCodes(codes, connection = null) {
  return queryIn('SELECT id,sku FROM product_skus WHERE sku IN', codes, connection);
}
async function findSkusByBarcodes(codes, connection = null) {
  return queryIn('SELECT id,barcode FROM product_skus WHERE barcode IN', codes, connection);
}
async function findCustomersByDocuments(documents, connection = null) {
  return queryIn('SELECT id,document FROM customers WHERE document IN', documents, connection);
}
async function findSuppliersByDocuments(documents, connection = null) {
  return queryIn('SELECT id,document FROM suppliers WHERE document IN', documents, connection);
}
async function findCategoriesBySlugs(slugs, connection = null) {
  return queryIn('SELECT id,name,slug,is_active FROM categories WHERE slug IN', slugs, connection);
}
async function findBrandsBySlugs(slugs, connection = null) {
  return queryIn('SELECT id,name,slug,is_active FROM brands WHERE slug IN', slugs, connection);
}
async function findColorsByNames(names, connection = null) {
  return queryIn('SELECT id,name,hex_code,is_active FROM colors WHERE name IN', names, connection);
}
async function findSizesByLabels(labels, connection = null) {
  return queryIn('SELECT id,label,sort_order,is_active FROM sizes WHERE label IN', labels, connection);
}
async function findOpeningStockSkus(codes, connection = null) {
  const rows = await queryIn(`
    SELECT ps.id,ps.sku,ps.is_active sku_is_active,pv.is_active variant_is_active,p.is_active product_is_active,
           COALESCE(sb.quantity,0) quantity,
           EXISTS(SELECT 1 FROM stock_movements sm WHERE sm.product_sku_id=ps.id LIMIT 1) has_history
      FROM product_skus ps
      JOIN product_variants pv ON pv.id=ps.product_variant_id
      JOIN products p ON p.id=pv.product_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id=ps.id
     WHERE ps.sku IN`, codes, connection);
  return rows;
}

async function findCategoryBySlug(slug, connection) {
  const [rows] = await connection.execute('SELECT id,name,slug FROM categories WHERE slug=? LIMIT 1', [slug]);
  return rows[0] || null;
}
async function insertCategory(data, connection) {
  const [result] = await connection.execute('INSERT INTO categories (name,slug,is_active) VALUES (?,?,1)', [data.name, data.slug]);
  return result.insertId;
}
async function findBrandBySlug(slug, connection) {
  const [rows] = await connection.execute('SELECT id,name,slug FROM brands WHERE slug=? LIMIT 1', [slug]);
  return rows[0] || null;
}
async function insertBrand(data, connection) {
  const [result] = await connection.execute('INSERT INTO brands (name,slug,is_active) VALUES (?,?,1)', [data.name, data.slug]);
  return result.insertId;
}
async function findColorByName(name, connection) {
  const [rows] = await connection.execute('SELECT id,name,hex_code FROM colors WHERE name=? LIMIT 1', [name]);
  return rows[0] || null;
}
async function insertColor(data, connection) {
  const [result] = await connection.execute('INSERT INTO colors (name,hex_code,is_active) VALUES (?,?,1)', [data.name, data.hexCode]);
  return result.insertId;
}
async function findSizeByLabel(label, connection) {
  const [rows] = await connection.execute('SELECT id,label,sort_order FROM sizes WHERE label=? LIMIT 1', [label]);
  return rows[0] || null;
}
async function insertSize(data, connection) {
  const [result] = await connection.execute('INSERT INTO sizes (label,sort_order,is_active) VALUES (?,?,1)', [data.label, data.sortOrder]);
  return result.insertId;
}
async function insertProduct(data, categoryId, brandId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO products (
      category_id,brand_id,internal_code,name,description,model,audience,collection_name,material,
      base_cost_price,base_sale_price,promotional_price,is_active,is_featured,is_catalog_visible
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)
  `, [categoryId, brandId, data.internalCode, data.name, data.description, data.model, data.audience, data.collectionName, data.material,
    data.baseCostPrice, data.baseSalePrice, data.promotionalPrice, data.isCatalogVisible ? 1 : 0]);
  return result.insertId;
}
async function findVariant(productId, colorId, connection) {
  const [rows] = await connection.execute('SELECT id FROM product_variants WHERE product_id=? AND color_id=? LIMIT 1', [productId, colorId]);
  return rows[0] || null;
}
async function insertVariant(productId, colorId, connection) {
  const [result] = await connection.execute('INSERT INTO product_variants (product_id,color_id,is_active) VALUES (?,?,1)', [productId, colorId]);
  return result.insertId;
}
async function insertSku(data, variantId, sizeId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO product_skus (product_variant_id,size_id,sku,barcode,cost_price,sale_price,promotional_price,minimum_stock,is_active)
    VALUES (?,?,?,?,?,?,?,?,1)
  `, [variantId,sizeId,data.sku,data.barcode,data.costPrice,data.salePrice,data.promotionalPrice,data.minimumStock]);
  await connection.execute('INSERT INTO stock_balances (product_sku_id,quantity) VALUES (?,0)', [result.insertId]);
  return result.insertId;
}
async function insertCustomer(data, actorId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO customers (
      name,document,phone,whatsapp,email,birth_date,postal_code,street,street_number,address_complement,neighborhood,city,state,notes,is_active,
      created_by_user_id,updated_by_user_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [data.name,data.document,data.phone,data.whatsapp,data.email,data.birthDate,data.postalCode,data.street,data.streetNumber,data.addressComplement,
    data.neighborhood,data.city,data.state,data.notes,data.isActive?1:0,actorId,actorId]);
  return result.insertId;
}
async function insertSupplier(data, actorId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO suppliers (
      legal_name,trade_name,document,contact_name,phone,whatsapp,email,postal_code,street,street_number,address_complement,neighborhood,city,state,notes,is_active,
      created_by_user_id,updated_by_user_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [data.legalName,data.tradeName,data.document,data.contactName,data.phone,data.whatsapp,data.email,data.postalCode,data.street,data.streetNumber,
    data.addressComplement,data.neighborhood,data.city,data.state,data.notes,data.isActive?1:0,actorId,actorId]);
  return result.insertId;
}
async function findSkuByCode(code, connection) {
  const [rows] = await connection.execute('SELECT id,sku FROM product_skus WHERE sku=? LIMIT 1', [code]);
  return rows[0] || null;
}

module.exports = {
  createBatch, findBatchByApplyKey, findBatchById, findBatchForUpdate, findBatchByValidationKey, listBatches, markBatchApplied, markBatchFailed,
  findProductsByCodes, findSkusByCodes, findSkusByBarcodes, findCustomersByDocuments, findSuppliersByDocuments,
  findCategoriesBySlugs, findBrandsBySlugs, findColorsByNames, findSizesByLabels, findOpeningStockSkus,
  findCategoryBySlug, insertCategory, findBrandBySlug, insertBrand, findColorByName, insertColor, findSizeByLabel, insertSize,
  insertProduct, findVariant, insertVariant, insertSku, insertCustomer, insertSupplier, findSkuByCode
};
