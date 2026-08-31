'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const MIGRATION_LOCK = 'nm_calcados_schema_migrations';

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function loadMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d{3}_.+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    'SELECT filename, checksum FROM schema_migrations ORDER BY filename'
  );

  return new Map(rows.map((row) => [row.filename, row.checksum]));
}

async function acquireLock(connection) {
  const [rows] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [MIGRATION_LOCK]);

  if (Number(rows[0]?.acquired) !== 1) {
    throw new Error('Não foi possível obter o lock exclusivo das migrations.');
  }
}

async function releaseLock(connection) {
  await connection.query('SELECT RELEASE_LOCK(?)', [MIGRATION_LOCK]);
}

async function runMigrations() {
  const connection = await mysql.createConnection(
    getDatabaseConfig({ multipleStatements: true })
  );

  let lockAcquired = false;

  try {
    await acquireLock(connection);
    lockAcquired = true;
    await ensureMigrationTable(connection);

    const files = await loadMigrationFiles();
    const applied = await getAppliedMigrations(connection);
    let appliedCount = 0;

    for (const filename of files) {
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      const fileChecksum = checksum(sql);
      const previousChecksum = applied.get(filename);

      if (previousChecksum) {
        if (previousChecksum !== fileChecksum) {
          throw new Error(
            `Migration já aplicada foi alterada: ${filename}. Crie uma nova migration em vez de editar o histórico.`
          );
        }

        console.log(`- ${filename}: já aplicada`);
        continue;
      }

      console.log(`> Aplicando ${filename}...`);
      await connection.query(sql);
      await connection.execute(
        'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
        [filename, fileChecksum]
      );
      appliedCount += 1;
      console.log(`✓ ${filename}: aplicada`);
    }

    console.log(`Migrations concluídas. Novas migrations aplicadas: ${appliedCount}.`);
    return { appliedCount };
  } finally {
    if (lockAcquired) {
      try {
        await releaseLock(connection);
      } catch (error) {
        console.error('Falha ao liberar lock de migration:', error.message);
      }
    }

    await connection.end();
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Falha ao executar migrations:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { runMigrations };
