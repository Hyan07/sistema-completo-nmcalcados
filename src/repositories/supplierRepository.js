'use strict';

const { getPool } = require('../config/database');

const LIST_COLUMNS = `
  s.id, s.legal_name, s.trade_name, s.document, s.contact_name,
  s.phone, s.whatsapp, s.email, s.city, s.state, s.is_active,
  s.created_at, s.updated_at
`;
const DETAIL_COLUMNS = `
  s.id, s.legal_name, s.trade_name, s.document, s.contact_name,
  s.phone, s.whatsapp, s.email, s.postal_code, s.street, s.street_number,
  s.address_complement, s.neighborhood, s.city, s.state, s.notes, s.is_active,
  s.created_by_user_id, s.updated_by_user_id, s.created_at, s.updated_at
`;

function buildFilters(filters) {
  const where = [];
  const params = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    const numericLike = `%${filters.numericQ || filters.q}%`;
    where.push('(s.legal_name LIKE ? OR s.trade_name LIKE ? OR s.email LIKE ? OR s.document LIKE ? OR s.phone LIKE ? OR s.whatsapp LIKE ?)');
    params.push(like, like, like, numericLike, numericLike, numericLike);
  }
  if (filters.isActive !== null && filters.isActive !== undefined) { where.push('s.is_active = ?'); params.push(filters.isActive); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listSuppliers(filters, pagination) {
  const built = buildFilters(filters);
  const db = getPool();
  const [rows] = await db.execute(`SELECT ${LIST_COLUMNS} FROM suppliers s ${built.sql} ORDER BY s.is_active DESC, COALESCE(s.trade_name, s.legal_name), s.id LIMIT ? OFFSET ?`, [...built.params, pagination.pageSize, pagination.offset]);
  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM suppliers s ${built.sql}`, built.params);
  return { rows, total: Number(countRows[0].total) };
}
async function lookupSuppliers(q, numericQ) {
  const like = `%${q}%`; const numericLike = `%${numericQ || q}%`;
  const [rows] = await getPool().execute(`
    SELECT ${LIST_COLUMNS} FROM suppliers s
     WHERE s.is_active = 1 AND (s.legal_name LIKE ? OR s.trade_name LIKE ? OR s.document LIKE ? OR s.phone LIKE ? OR s.whatsapp LIKE ?)
     ORDER BY COALESCE(s.trade_name, s.legal_name), s.id LIMIT 10
  `, [like, like, numericLike, numericLike, numericLike]);
  return rows;
}
async function findSupplierById(id, connection = null) { const db = connection || getPool(); const [rows] = await db.execute(`SELECT ${DETAIL_COLUMNS} FROM suppliers s WHERE s.id = ?`, [id]); return rows[0] || null; }
async function findSupplierForUpdate(id, connection) { const [rows] = await connection.execute(`SELECT ${DETAIL_COLUMNS} FROM suppliers s WHERE s.id = ? FOR UPDATE`, [id]); return rows[0] || null; }
async function countOpenPurchases(supplierId, connection) { const [rows] = await connection.execute(`SELECT COUNT(*) AS total FROM purchases WHERE supplier_id = ? AND status IN ('DRAFT','ORDERED','PARTIALLY_RECEIVED')`, [supplierId]); return Number(rows[0].total); }
async function createSupplier(data, userId, connection) {
  const [result] = await connection.execute(`INSERT INTO suppliers (legal_name, trade_name, document, contact_name, phone, whatsapp, email, postal_code, street, street_number, address_complement, neighborhood, city, state, notes, is_active, created_by_user_id, updated_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.legalName,data.tradeName,data.document,data.contactName,data.phone,data.whatsapp,data.email,data.postalCode,data.street,data.streetNumber,data.addressComplement,data.neighborhood,data.city,data.state,data.notes,data.isActive,userId,userId]);
  return result.insertId;
}
async function updateSupplier(id, data, userId, connection) {
  const map={legalName:'legal_name',tradeName:'trade_name',document:'document',contactName:'contact_name',phone:'phone',whatsapp:'whatsapp',email:'email',postalCode:'postal_code',street:'street',streetNumber:'street_number',addressComplement:'address_complement',neighborhood:'neighborhood',city:'city',state:'state',notes:'notes',isActive:'is_active'}; const columns=[]; const values=[];
  for(const [key,column] of Object.entries(map)){if(Object.prototype.hasOwnProperty.call(data,key)){columns.push(`${column} = ?`);values.push(data[key]);}}
  if(!columns.length)return; columns.push('updated_by_user_id = ?'); values.push(userId,id); await connection.execute(`UPDATE suppliers SET ${columns.join(', ')} WHERE id = ?`,values);
}
module.exports={countOpenPurchases,createSupplier,findSupplierById,findSupplierForUpdate,listSuppliers,lookupSuppliers,updateSupplier};
