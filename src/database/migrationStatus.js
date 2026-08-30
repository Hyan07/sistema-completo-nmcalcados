'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
let cachedManifest = null;

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function loadLocalMigrationManifest({ refresh = false } = {}) {
  if (cachedManifest && !refresh) return cachedManifest;
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^\d{3}_.+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const manifest = [];
  for (const filename of files) {
    const content = await fs.readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
    manifest.push({ filename, checksum: checksum(content) });
  }
  cachedManifest = manifest;
  return manifest;
}

function compareMigrationState(localManifest, appliedRows, { migrationTableExists = true } = {}) {
  const local = new Map(localManifest.map((item) => [item.filename, item.checksum]));
  const applied = new Map((appliedRows || []).map((item) => [item.filename, item.checksum]));
  const pending = [];
  const mismatched = [];
  const orphaned = [];

  for (const [filename, expectedChecksum] of local) {
    const actualChecksum = applied.get(filename);
    if (!actualChecksum) pending.push(filename);
    else if (actualChecksum !== expectedChecksum) mismatched.push(filename);
  }
  for (const filename of applied.keys()) if (!local.has(filename)) orphaned.push(filename);

  return {
    migrationTableExists,
    localCount: local.size,
    appliedCount: applied.size,
    pending,
    mismatched,
    orphaned,
    ready: migrationTableExists && pending.length === 0 && mismatched.length === 0 && orphaned.length === 0
  };
}

async function getMigrationStatus(connection) {
  const localManifest = await loadLocalMigrationManifest();
  const [tableRows] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'`
  );
  const migrationTableExists = Number(tableRows[0]?.total || 0) === 1;
  if (!migrationTableExists) return compareMigrationState(localManifest, [], { migrationTableExists: false });
  const [appliedRows] = await connection.query('SELECT filename, checksum FROM schema_migrations ORDER BY filename');
  return compareMigrationState(localManifest, appliedRows, { migrationTableExists: true });
}

module.exports = { compareMigrationState, getMigrationStatus, loadLocalMigrationManifest };
