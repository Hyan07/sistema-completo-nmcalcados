'use strict';

const { env } = require('./src/config/env');
const { closePool } = require('./src/config/database');
const { createApp } = require('./src/app');

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[NM Calçados] servidor iniciado na porta ${env.port} (${env.nodeEnv})`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[NM Calçados] ${signal} recebido. Encerrando servidor...`);

  server.close(async (error) => {
    if (error) {
      console.error('[NM Calçados] erro ao encerrar servidor:', error);
      process.exitCode = 1;
    }

    try {
      await closePool();
    } catch (poolError) {
      console.error('[NM Calçados] erro ao encerrar pool MySQL:', poolError);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
