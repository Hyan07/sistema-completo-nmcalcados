'use strict';

const { getPool } = require('../config/database');

async function listBrands(search = '') {
  const like = `%${search}%`;
  const [rows] = await getPool().execute(`
    SELECT b.id, b.name, b.slug, b.is_active, b.created_at, b.updated_at,
           (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.is_active = 1) AS active_products
      FROM brands b
     WHERE (? = '' OR b.name LIKE ? OR b.slug LIKE ?)
     ORDER BY b.name, b.id
  `, [search, like, like]);
  return rows;
}

async function findBrandById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`SELECT id, name, slug, is_active FROM brands WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}

async function findBrandBySlug(slug, excludeId = null, connection = null) {
  const db = connection || getPool();
  const params = [slug];
  let sql = 'SELECT id FROM brands WHERE slug = ?';
  if (excludeId) { sql += ' AND id <> ?'; params.push(excludeId); }
  sql += ' LIMIT 1';
  const [rows] = await db.execute(sql, params);
  return rows[0] || null;
}

async function createBrand(data, connection) {
  const [result] = await connection.execute('INSERT INTO brands (name, slug, is_active) VALUES (?, ?, ?)', [data.name, data.slug, data.isActive]);
  return result.insertId;
}

async function updateBrand(id, data, connection) {
  const columns = [];
  const values = [];
  for (const [key, column] of [['name','name'],['slug','slug'],['isActive','is_active']]) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE brands SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function countActiveProducts(brandId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM products WHERE brand_id = ? AND is_active = 1', [brandId]);
  return Number(rows[0].total);
}

module.exports = { countActiveProducts, createBrand, findBrandById, findBrandBySlug, listBrands, updateBrand };
