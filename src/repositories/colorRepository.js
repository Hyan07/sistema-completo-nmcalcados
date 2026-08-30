'use strict';

const { getPool } = require('../config/database');

async function listColors() {
  const [rows] = await getPool().query(`
    SELECT c.id, c.name, c.hex_code, c.is_active, c.created_at, c.updated_at,
           COUNT(DISTINCT CASE WHEN pv.is_active = 1 THEN pv.id END) AS active_variant_count
      FROM colors c
      LEFT JOIN product_variants pv ON pv.color_id = c.id
     GROUP BY c.id, c.name, c.hex_code, c.is_active, c.created_at, c.updated_at
     ORDER BY c.name, c.id
  `);
  return rows;
}

async function findColorById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`SELECT id, name, hex_code, is_active FROM colors WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}

async function createColor(data, connection) {
  const [result] = await connection.execute('INSERT INTO colors (name, hex_code, is_active) VALUES (?, ?, ?)', [data.name, data.hexCode, data.isActive]);
  return result.insertId;
}

async function updateColor(id, data, connection) {
  const columns = [];
  const values = [];
  const map = { name: 'name', hexCode: 'hex_code', isActive: 'is_active' };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id);
  await connection.execute(`UPDATE colors SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function countActiveVariants(colorId, connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM product_variants WHERE color_id = ? AND is_active = 1', [colorId]);
  return Number(rows[0].total);
}

module.exports = { countActiveVariants, createColor, findColorById, listColors, updateColor };
