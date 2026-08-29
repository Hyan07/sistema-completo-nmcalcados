'use strict';

const { getPool } = require('../config/database');

const PRODUCT_COLUMNS = `
  p.id, p.category_id, p.brand_id, p.internal_code, p.name, p.description,
  p.model, p.audience, p.collection_name, p.material,
  p.base_cost_price, p.base_sale_price, p.promotional_price,
  p.is_active, p.is_featured, p.is_catalog_visible, p.created_at, p.updated_at,
  c.name AS category_name, b.name AS brand_name,
  CASE WHEN p.base_sale_price > 0 THEN ROUND(((p.base_sale_price - p.base_cost_price) / p.base_sale_price) * 100, 2) ELSE NULL END AS estimated_margin_percent
`;

function buildProductFilters(filters) {
  const where = [];
  const params = [];
  if (filters.q) {
    where.push('(p.name LIKE ? OR p.internal_code LIKE ? OR p.model LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.categoryId) { where.push('p.category_id = ?'); params.push(filters.categoryId); }
  if (filters.brandId) { where.push('p.brand_id = ?'); params.push(filters.brandId); }
  if (filters.isActive !== null && filters.isActive !== undefined) { where.push('p.is_active = ?'); params.push(filters.isActive); }
  if (filters.isCatalogVisible !== null && filters.isCatalogVisible !== undefined) { where.push('p.is_catalog_visible = ?'); params.push(filters.isCatalogVisible); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listProducts(filters, pagination) {
  const built = buildProductFilters(filters);
  const [rows] = await getPool().execute(`
    SELECT ${PRODUCT_COLUMNS},
           (SELECT pi.file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order, pi.id LIMIT 1) AS primary_image
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      ${built.sql}
     ORDER BY p.name, p.id
     LIMIT ? OFFSET ?
  `, [...built.params, pagination.pageSize, pagination.offset]);
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM products p ${built.sql}`, built.params);
  return { rows, total: Number(countRows[0].total) };
}

async function findProductById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT ${PRODUCT_COLUMNS}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.id = ?${forUpdate ? ' FOR UPDATE' : ''}
  `, [id]);
  return rows[0] || null;
}

async function createProduct(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO products (
      category_id, brand_id, internal_code, name, description, model, audience,
      collection_name, material, base_cost_price, base_sale_price, promotional_price,
      is_active, is_featured, is_catalog_visible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.categoryId, data.brandId, data.internalCode, data.name, data.description, data.model,
    data.audience, data.collectionName, data.material, data.baseCostPrice, data.baseSalePrice,
    data.promotionalPrice, data.isActive, data.isFeatured, data.isCatalogVisible
  ]);
  return result.insertId;
}

async function updateProduct(id, data, connection) {
  const map = {
    categoryId: 'category_id', brandId: 'brand_id', internalCode: 'internal_code', name: 'name',
    description: 'description', model: 'model', audience: 'audience', collectionName: 'collection_name',
    material: 'material', baseCostPrice: 'base_cost_price', baseSalePrice: 'base_sale_price',
    promotionalPrice: 'promotional_price', isActive: 'is_active', isFeatured: 'is_featured',
    isCatalogVisible: 'is_catalog_visible'
  };
  const columns = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE products SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function listImages(productId, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT id, product_id, product_variant_id, file_path, alt_text, sort_order, is_primary, created_at
      FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order, id
  `, [productId]);
  return rows;
}

async function getImageById(productId, imageId, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`SELECT id, product_id, file_path, alt_text, sort_order, is_primary FROM product_images WHERE id = ? AND product_id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [imageId, productId]);
  return rows[0] || null;
}

async function countImages(productId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM product_images WHERE product_id = ?', [productId]);
  return Number(rows[0].total);
}

async function maxImageSortOrder(productId, connection) {
  const [rows] = await connection.execute('SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM product_images WHERE product_id = ?', [productId]);
  return Number(rows[0].max_sort);
}

async function hasPrimaryImage(productId, connection) {
  const [rows] = await connection.execute('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1', [productId]);
  return Boolean(rows[0]);
}

async function insertImage(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO product_images (product_id, file_path, alt_text, sort_order, is_primary)
    VALUES (?, ?, ?, ?, ?)
  `, [data.productId, data.filePath, data.altText, data.sortOrder, data.isPrimary]);
  return result.insertId;
}

async function clearPrimaryImage(productId, connection) {
  await connection.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [productId]);
}

async function updateImage(productId, imageId, data, connection) {
  const columns = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(data, 'altText')) { columns.push('alt_text = ?'); values.push(data.altText); }
  if (Object.prototype.hasOwnProperty.call(data, 'sortOrder')) { columns.push('sort_order = ?'); values.push(data.sortOrder); }
  if (Object.prototype.hasOwnProperty.call(data, 'isPrimary')) { columns.push('is_primary = ?'); values.push(data.isPrimary); }
  if (!columns.length) return;
  values.push(imageId, productId);
  await connection.execute(`UPDATE product_images SET ${columns.join(', ')} WHERE id = ? AND product_id = ?`, values);
}

async function deleteImage(productId, imageId, connection) {
  await connection.execute('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
}

async function promoteFirstImage(productId, connection) {
  const [rows] = await connection.execute('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1', [productId]);
  if (rows[0]) await connection.execute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [rows[0].id]);
}

module.exports = {
  clearPrimaryImage,
  countImages,
  createProduct,
  deleteImage,
  findProductById,
  getImageById,
  hasPrimaryImage,
  insertImage,
  listImages,
  listProducts,
  maxImageSortOrder,
  promoteFirstImage,
  updateImage,
  updateProduct
};
