'use strict';

const { validateProductionEnvironment } = require('../src/deploy/productionReadiness');

async function main() {
  const validation = validateProductionEnvironment(process.env);
  for (const warning of validation.warnings) console.warn(`AVISO: ${warning}`);
  if (!validation.ok) {
    for (const error of validation.errors) console.error(`ERRO: ${error}`);
    process.exitCode = 1;
    return;
  }

  const { getPool, closePool } = require('../src/config/database');
  const { getMigrationStatus } = require('../src/database/migrationStatus');
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT DATABASE() database_name, VERSION() server_version');
    const status = await getMigrationStatus(pool);
    if (!status.ready) {
      console.error(`ERRO: schema não está pronto (pendentes=${status.pending.length}, divergentes=${status.mismatched.length}, órfãs=${status.orphaned.length}).`);
      process.exitCode = 2;
      return;
    }
    console.log('Configuração de produção validada.');
    console.log(`MySQL conectado ao banco configurado (${rows[0].server_version}).`);
    console.log(`Migrations: ${status.appliedCount}/${status.localCount} aplicadas e íntegras.`);
  } finally {
    await closePool().catch(() => {});
  }
}

main().catch((error) => {
  console.error('Falha na verificação de produção:', error.message);
  process.exitCode = 1;
});
