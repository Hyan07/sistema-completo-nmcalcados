'use strict';

const { env } = require('./src/config/env');
const { closePool } = require('./src/config/database');
const { runMigrations } = require('./src/database/migrate');
const { bootstrapAdmin } = require('./scripts/bootstrap-admin');
const { createApp } = require('./src/app');

let server = null;
let shuttingDown = false;

function hasBootstrapPassword() {
  return Boolean(String(process.env.ADMIN_PASSWORD || '').trim());
}

async function prepareRuntime() {
  const shouldPrepareSchema = env.isProduction || hasBootstrapPassword();
  if (!shouldPrepareSchema) return;

  console.log('[NM Calçados] preparando schema do banco antes de iniciar o servidor...');
  await runMigrations();

  if (hasBootstrapPassword()) {
    await bootstrapAdmin();
    console.warn('[NM Calçados] bootstrap de administrador concluído/validado. Remova ADMIN_PASSWORD do ambiente após este deploy.');
  }
}

async function start() {
  await prepareRuntime();
  const app = createApp();
  server = app.listen(env.port, () => {
    console.log(`[NM Calçados] servidor iniciado na porta ${env.port} (${env.nodeEnv})`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[NM Calçados] ${signal} recebido. Encerrando servidor...`);

  if (!server) {
    await closePool().catch(() => {});
    process.exit();
    return;
  }

  server.close(async (error) => {
    if (error) {
      console.error('[NM Calçados] erro ao encerrar servidor:', error.message);
      process.exitCode = 1;
    }

    try {
      await closePool();
    } catch (poolError) {
      console.error('[NM Calçados] erro ao encerrar pool MySQL:', poolError.message);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(async (error) => {
  console.error('[NM Calçados] falha ao iniciar aplicação:', error.message);
  await closePool().catch(() => {});
  process.exit(1);
});
