'use strict';

const { getPool } = require('../config/database');

async function listGrade(productId) {
  const db = getPool();
  const [variantRows] = await db.execute(`
    SELECT pv.id, pv.product_id, pv.color_id, pv.variant_name, pv.is_active, pv.created_at, pv.updated_at,
           c.name AS color_name, c.hex_code,
           COUNT(ps.id) AS sku_count,
           SUM(CASE WHEN ps.is_active = 1 THEN 1 ELSE 0 END) AS active_sku_count
      FROM product_variants pv
      JOIN colors c ON c.id = pv.color_id
      LEFT JOIN product_skus ps ON ps.product_variant_id = pv.id
     WHERE pv.product_id = ?
     GROUP BY pv.id, pv.product_id, pv.color_id, pv.variant_name, pv.is_active, pv.created_at, pv.updated_at, c.name, c.hex_code
     ORDER BY c.name, pv.id
  `, [productId]);

  const [skuRows] = await db.execute(`
    SELECT ps.id, ps.product_variant_id, ps.size_id, ps.sku, ps.barcode,
           ps.cost_price, ps.sale_price, ps.promotional_price, ps.minimum_stock, ps.is_active,
           ps.created_at, ps.updated_at, s.label AS size_label, s.sort_order
      FROM product_skus ps
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN sizes s ON s.id = ps.size_id
     WHERE pv.product_id = ?
     ORDER BY pv.id, s.sort_order, s.label, ps.id
  `, [productId]);

  const [imageRows] = await db.execute(`
    SELECT id, product_variant_id, file_path, alt_text, sort_order, is_primary
      FROM product_images
     WHERE product_id = ? AND product_variant_id IS NOT NULL
     ORDER BY product_variant_id, sort_order, id
  `, [productId]);

  return variantRows.map((variant) => ({
    ...variant,
    skus: skuRows.filter((sku) => String(sku.product_variant_id) === String(variant.id)),
    images: imageRows.filter((image) => String(image.product_variant_id) === String(variant.id))
  }));
}

async function findProductImageById(productId, imageId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`SELECT id, product_id, product_variant_id, file_path, alt_text, is_primary FROM product_images WHERE id = ? AND product_id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [imageId, productId]);
  return rows[0] || null;
}

async function assignImageVariant(imageId, variantId, connection) {
  await connection.execute('UPDATE product_images SET product_variant_id = ? WHERE id = ?', [variantId, imageId]);
}

async function findVariantById(productId, variantId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT pv.id, pv.product_id, pv.color_id, pv.variant_name, pv.is_active, c.name AS color_name, c.is_active AS color_is_active
      FROM product_variants pv
      JOIN colors c ON c.id = pv.color_id
     WHERE pv.id = ? AND pv.product_id = ?${forUpdate ? ' FOR UPDATE' : ''}
  `, [variantId, productId]);
  return rows[0] || null;
}

async function findVariantByColor(productId, colorId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT pv.id, pv.product_id, pv.color_id, pv.variant_name, pv.is_active, c.name AS color_name, c.is_active AS color_is_active
      FROM product_variants pv
      JOIN colors c ON c.id = pv.color_id
     WHERE pv.product_id = ? AND pv.color_id = ?${forUpdate ? ' FOR UPDATE' : ''}
     LIMIT 1
  `, [productId, colorId]);
  return rows[0] || null;
}

async function createVariant(productId, data, connection) {
  const [result] = await connection.execute(
    'INSERT INTO product_variants (product_id, color_id, variant_name, is_active) VALUES (?, ?, ?, ?)',
    [productId, data.colorId, data.variantName, data.isActive]
  );
  return result.insertId;
}

async function updateVariant(variantId, data, connection) {
  const columns = [];
  const values = [];
  const map = { colorId: 'color_id', variantName: 'variant_name', isActive: 'is_active' };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(variantId);
  await connection.execute(`UPDATE product_variants SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function deactivateSkusByVariant(variantId, connection) {
  await connection.execute('UPDATE product_skus SET is_active = 0 WHERE product_variant_id = ? AND is_active = 1', [variantId]);
}

async function findSkuById(variantId, skuId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT ps.id, ps.product_variant_id, ps.size_id, ps.sku, ps.barcode, ps.cost_price, ps.sale_price,
           ps.promotional_price, ps.minimum_stock, ps.is_active, s.label AS size_label, s.is_active AS size_is_active
      FROM product_skus ps
      JOIN sizes s ON s.id = ps.size_id
     WHERE ps.id = ? AND ps.product_variant_id = ?${forUpdate ? ' FOR UPDATE' : ''}
  `, [skuId, variantId]);
  return rows[0] || null;
}

async function findSkuBySize(variantId, sizeId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT ps.id, ps.product_variant_id, ps.size_id, ps.sku, ps.barcode, ps.cost_price, ps.sale_price,
           ps.promotional_price, ps.minimum_stock, ps.is_active, s.label AS size_label, s.is_active AS size_is_active
      FROM product_skus ps
      JOIN sizes s ON s.id = ps.size_id
     WHERE ps.product_variant_id = ? AND ps.size_id = ?${forUpdate ? ' FOR UPDATE' : ''}
     LIMIT 1
  `, [variantId, sizeId]);
  return rows[0] || null;
}

async function createSku(variantId, data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO product_skus (
      product_variant_id, size_id, sku, barcode, cost_price, sale_price,
      promotional_price, minimum_stock, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [variantId, data.sizeId, data.sku, data.barcode, data.costPrice, data.salePrice, data.promotionalPrice, data.minimumStock, data.isActive]);
  await connection.execute('INSERT IGNORE INTO stock_balances (product_sku_id, quantity) VALUES (?, 0)', [result.insertId]);
  return result.insertId;
}

async function updateSku(skuId, data, connection) {
  const columns = [];
  const values = [];
  const map = {
    sizeId: 'size_id', sku: 'sku', barcode: 'barcode', costPrice: 'cost_price', salePrice: 'sale_price',
    promotionalPrice: 'promotional_price', minimumStock: 'minimum_stock', isActive: 'is_active'
  };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(skuId);
  await connection.execute(`UPDATE product_skus SET ${columns.join(', ')} WHERE id = ?`, values);
}

module.exports = {
  assignImageVariant,
  createSku,
  createVariant,
  deactivateSkusByVariant,
  findProductImageById,
  findSkuById,
  findSkuBySize,
  findVariantByColor,
  findVariantById,
  listGrade,
  updateSku,
  updateVariant
};
