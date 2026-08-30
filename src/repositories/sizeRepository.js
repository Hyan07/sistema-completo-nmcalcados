'use strict';

const { getPool } = require('../config/database');

async function listSizes() {
  const [rows] = await getPool().query(`
    SELECT s.id, s.label, s.sort_order, s.is_active, s.created_at, s.updated_at,
           COUNT(DISTINCT CASE WHEN ps.is_active = 1 THEN ps.id END) AS active_sku_count
      FROM sizes s
      LEFT JOIN product_skus ps ON ps.size_id = s.id
     GROUP BY s.id, s.label, s.sort_order, s.is_active, s.created_at, s.updated_at
     ORDER BY s.sort_order, s.label, s.id
  `);
  return rows;
}

async function findSizeById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`SELECT id, label, sort_order, is_active FROM sizes WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}

async function createSize(data, connection) {
  const [result] = await connection.execute('INSERT INTO sizes (label, sort_order, is_active) VALUES (?, ?, ?)', [data.label, data.sortOrder, data.isActive]);
  return result.insertId;
}

async function updateSize(id, data, connection) {
  const columns = [];
  const values = [];
  const map = { label: 'label', sortOrder: 'sort_order', isActive: 'is_active' };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE sizes SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function countActiveSkus(sizeId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM product_skus WHERE size_id = ? AND is_active = 1', [sizeId]);
  return Number(rows[0].total);
}

module.exports = { countActiveSkus, createSize, findSizeById, listSizes, updateSize };
