'use strict';

const { getPool } = require('../config/database');

async function listCategories(search = '') {
  const like = `%${search}%`;
  const [rows] = await getPool().execute(`
    SELECT c.id, c.parent_id, c.name, c.slug, c.is_active, c.created_at, c.updated_at,
           p.name AS parent_name,
           (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_active = 1) AS active_products,
           (SELECT COUNT(*) FROM categories ch WHERE ch.parent_id = c.id AND ch.is_active = 1) AS active_children
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
     WHERE (? = '' OR c.name LIKE ? OR c.slug LIKE ?)
     ORDER BY COALESCE(p.name, ''), c.name, c.id
  `, [search, like, like]);
  return rows;
}

async function findCategoryById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(
    `SELECT id, parent_id, name, slug, is_active FROM categories WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
}

async function findCategoryBySlug(slug, excludeId = null, connection = null) {
  const db = connection || getPool();
  const params = [slug];
  let sql = 'SELECT id FROM categories WHERE slug = ?';
  if (excludeId) { sql += ' AND id <> ?'; params.push(excludeId); }
  sql += ' LIMIT 1';
  const [rows] = await db.execute(sql, params);
  return rows[0] || null;
}

async function createCategory(data, connection) {
  const [result] = await connection.execute(
    'INSERT INTO categories (parent_id, name, slug, is_active) VALUES (?, ?, ?, ?)',
    [data.parentId, data.name, data.slug, data.isActive]
  );
  return result.insertId;
}

async function updateCategory(id, data, connection) {
  const columns = [];
  const values = [];
  const map = { parentId: 'parent_id', name: 'name', slug: 'slug', isActive: 'is_active' };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE categories SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function countActiveProducts(categoryId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND is_active = 1', [categoryId]);
  return Number(rows[0].total);
}

async function countActiveChildren(categoryId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM categories WHERE parent_id = ? AND is_active = 1', [categoryId]);
  return Number(rows[0].total);
}

async function isDescendant(candidateParentId, categoryId, connection) {
  let currentId = candidateParentId;
  const visited = new Set();
  while (currentId) {
    if (Number(currentId) === Number(categoryId)) return true;
    if (visited.has(String(currentId))) return true;
    visited.add(String(currentId));
    const row = await findCategoryById(currentId, connection);
    currentId = row?.parent_id || null;
  }
  return false;
}

module.exports = {
  countActiveChildren,
  countActiveProducts,
  createCategory,
  findCategoryById,
  findCategoryBySlug,
  isDescendant,
  listCategories,
  updateCategory
};
