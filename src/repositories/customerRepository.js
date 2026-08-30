'use strict';

const { getPool } = require('../config/database');

const CUSTOMER_LIST_COLUMNS = `
  c.id, c.name, c.document, c.phone, c.whatsapp, c.email, c.city, c.state,
  c.is_active, c.created_at, c.updated_at
`;

const CUSTOMER_COLUMNS = `
  c.id, c.name, c.document, c.phone, c.whatsapp, c.email, c.birth_date,
  c.postal_code, c.street, c.street_number, c.address_complement, c.neighborhood,
  c.city, c.state, c.notes, c.is_active, c.created_by_user_id, c.updated_by_user_id,
  c.created_at, c.updated_at
`;

function buildFilters(filters) {
  const where = [];
  const params = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    const numericLike = `%${filters.numericQ || filters.q}%`;
    where.push('(c.name LIKE ? OR c.email LIKE ? OR c.document LIKE ? OR c.phone LIKE ? OR c.whatsapp LIKE ?)');
    params.push(like, like, numericLike, numericLike, numericLike);
  }
  if (filters.isActive !== null && filters.isActive !== undefined) {
    where.push('c.is_active = ?');
    params.push(filters.isActive);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listCustomers(filters, pagination) {
  const built = buildFilters(filters);
  const [rows] = await getPool().execute(`
    SELECT ${CUSTOMER_LIST_COLUMNS}
      FROM customers c
      ${built.sql}
     ORDER BY c.name, c.id
     LIMIT ? OFFSET ?
  `, [...built.params, pagination.pageSize, pagination.offset]);
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM customers c ${built.sql}`, built.params);
  return { rows, total: Number(countRows[0].total) };
}

async function lookupCustomers(q, numericQ) {
  const like = `%${q}%`;
  const numericLike = `%${numericQ || q}%`;
  const [rows] = await getPool().execute(`
    SELECT c.id, c.name, c.document, c.phone, c.whatsapp, c.email
      FROM customers c
     WHERE c.is_active = 1
       AND (c.name LIKE ? OR c.email LIKE ? OR c.document LIKE ? OR c.phone LIKE ? OR c.whatsapp LIKE ?)
     ORDER BY CASE WHEN c.name LIKE ? THEN 0 ELSE 1 END, c.name, c.id
     LIMIT 10
  `, [like, like, numericLike, numericLike, numericLike, `${q}%`]);
  return rows;
}

async function findCustomerById(id, connection = null, { forUpdate = false } = {}) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT ${CUSTOMER_COLUMNS},
           creator.name AS created_by_name,
           updater.name AS updated_by_name,
           (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status IN ('COMPLETED','PARTIALLY_RETURNED','RETURNED')) AS sales_count,
           (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.status IN ('COMPLETED','PARTIALLY_RETURNED','RETURNED')) AS sales_total,
           (SELECT MAX(s.sold_at) FROM sales s WHERE s.customer_id = c.id AND s.status IN ('COMPLETED','PARTIALLY_RETURNED','RETURNED')) AS last_sale_at,
           (SELECT COUNT(*) FROM receivables r WHERE r.customer_id = c.id AND r.status IN ('OPEN','PARTIAL')) AS open_receivables_count,
           (SELECT COALESCE(SUM(r.outstanding_amount), 0) FROM receivables r WHERE r.customer_id = c.id AND r.status IN ('OPEN','PARTIAL')) AS outstanding_amount
      FROM customers c
      LEFT JOIN users creator ON creator.id = c.created_by_user_id
      LEFT JOIN users updater ON updater.id = c.updated_by_user_id
     WHERE c.id = ?${forUpdate ? ' FOR UPDATE' : ''}
  `, [id]);
  return rows[0] || null;
}

async function findCustomerForUpdate(id, connection) {
  const [rows] = await connection.execute(`
    SELECT ${CUSTOMER_COLUMNS}
      FROM customers c
     WHERE c.id = ? FOR UPDATE
  `, [id]);
  return rows[0] || null;
}

async function listRecentSales(customerId) {
  const [rows] = await getPool().execute(`
    SELECT id, sale_number, status, total_amount, sold_at
      FROM sales
     WHERE customer_id = ? AND status <> 'DRAFT'
     ORDER BY COALESCE(sold_at, created_at) DESC, id DESC
     LIMIT 20
  `, [customerId]);
  return rows;
}

async function listOpenReceivables(customerId) {
  const [rows] = await getPool().execute(`
    SELECT id, description, installment_number, due_date, original_amount, outstanding_amount, status
      FROM receivables
     WHERE customer_id = ? AND status IN ('OPEN','PARTIAL')
     ORDER BY due_date, id
     LIMIT 50
  `, [customerId]);
  return rows;
}

async function createCustomer(data, actorId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO customers (
      name, document, phone, whatsapp, email, birth_date, postal_code, street, street_number,
      address_complement, neighborhood, city, state, notes, is_active, created_by_user_id, updated_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.name, data.document, data.phone, data.whatsapp, data.email, data.birthDate, data.postalCode,
    data.street, data.streetNumber, data.addressComplement, data.neighborhood, data.city, data.state,
    data.notes, data.isActive, actorId, actorId
  ]);
  return result.insertId;
}

async function updateCustomer(id, data, actorId, connection) {
  const map = {
    name: 'name', document: 'document', phone: 'phone', whatsapp: 'whatsapp', email: 'email',
    birthDate: 'birth_date', postalCode: 'postal_code', street: 'street', streetNumber: 'street_number',
    addressComplement: 'address_complement', neighborhood: 'neighborhood', city: 'city', state: 'state',
    notes: 'notes', isActive: 'is_active'
  };
  const columns = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) { columns.push(`${column} = ?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  columns.push('updated_by_user_id = ?');
  values.push(actorId, id);
  await connection.execute(`UPDATE customers SET ${columns.join(', ')} WHERE id = ?`, values);
}

module.exports = {
  createCustomer, findCustomerById, findCustomerForUpdate, listCustomers, listOpenReceivables, listRecentSales, lookupCustomers, updateCustomer
};
