'use strict';

const { getPool } = require('../config/database');

async function createAuditLog({ userId = null, actionCode, entityType, entityId = null, previousData = null, newData = null, metadata = null }, connection = null) {
  const db = connection || getPool();
  await db.execute(
    `INSERT INTO audit_logs
      (user_id, action_code, entity_type, entity_id, previous_data, new_data, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      actionCode,
      entityType,
      entityId === null ? null : String(entityId),
      previousData ? JSON.stringify(previousData) : null,
      newData ? JSON.stringify(newData) : null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}

function buildAuditWhere(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push('(a.action_code LIKE ? OR a.entity_type LIKE ? OR a.entity_id LIKE ? OR u.name LIKE ? OR u.username LIKE ?)');
    params.push(like, like, like, like, like);
  }
  if (filters.userId) { clauses.push('a.user_id = ?'); params.push(filters.userId); }
  if (filters.actionCode) { clauses.push('a.action_code = ?'); params.push(filters.actionCode); }
  if (filters.entityType) { clauses.push('a.entity_type = ?'); params.push(filters.entityType); }
  if (filters.dateFrom) { clauses.push('a.created_at >= ?'); params.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { clauses.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${filters.dateTo} 00:00:00`); }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

async function listAuditLogs(filters, pagination) {
  const db = getPool();
  const where = buildAuditWhere(filters);
  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where.sql}`,
    where.params
  );
  const [rows] = await db.execute(
    `SELECT a.id, a.user_id, u.name AS user_name, u.username,
            a.action_code, a.entity_type, a.entity_id,
            a.previous_data, a.new_data, a.metadata, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where.sql}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT ? OFFSET ?`,
    [...where.params, pagination.pageSize, pagination.offset]
  );
  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function listAuditFacets() {
  const db = getPool();
  const [actions] = await db.execute('SELECT DISTINCT action_code FROM audit_logs ORDER BY action_code LIMIT 250');
  const [entities] = await db.execute('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type LIMIT 250');
  return { actions: actions.map((row) => row.action_code), entities: entities.map((row) => row.entity_type) };
}

module.exports = { createAuditLog, listAuditFacets, listAuditLogs };
