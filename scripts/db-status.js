'use strict';

const { getPool, closePool } = require('../src/config/database');
const { getMigrationStatus } = require('../src/database/migrationStatus');

(async () => {
  try {
    const status = await getMigrationStatus(getPool());
    console.log(`Migrations locais: ${status.localCount}`);
    console.log(`Migrations aplicadas: ${status.appliedCount}`);
    console.log(`Pendentes: ${status.pending.length}`);
    console.log(`Checksum divergente: ${status.mismatched.length}`);
    console.log(`Aplicadas sem arquivo local: ${status.orphaned.length}`);
    if (status.pending.length) console.log(`- Pendentes: ${status.pending.join(', ')}`);
    if (status.mismatched.length) console.log(`- Divergentes: ${status.mismatched.join(', ')}`);
    if (status.orphaned.length) console.log(`- Órfãs: ${status.orphaned.join(', ')}`);
    if (!status.ready) process.exitCode = 2;
  } catch (error) {
    console.error('Falha ao consultar status das migrations:', error.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
})();
