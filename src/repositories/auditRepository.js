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

module.exports = { createAuditLog };
