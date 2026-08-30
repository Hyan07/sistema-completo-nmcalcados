'use strict';

const { getPool } = require('../config/database');
const { getMigrationStatus } = require('../database/migrationStatus');

async function readiness() {
  const connection = await getPool().getConnection();
  try {
    await connection.query('SELECT 1');
    const migrations = await getMigrationStatus(connection);
    return {
      ready: migrations.ready,
      database: 'ok',
      migrations: {
        migrationTableExists: migrations.migrationTableExists,
        localCount: migrations.localCount,
        appliedCount: migrations.appliedCount,
        pending: migrations.pending.length,
        mismatched: migrations.mismatched.length,
        orphaned: migrations.orphaned.length
      }
    };
  } finally {
    connection.release();
  }
}

module.exports = { readiness };
