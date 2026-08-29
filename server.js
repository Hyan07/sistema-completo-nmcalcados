'use strict';

const { env } = require('./src/config/env');
const { createApp } = require('./src/app');

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[NM Calçados] servidor iniciado na porta ${env.port} (${env.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`[NM Calçados] ${signal} recebido. Encerrando servidor...`);
  server.close((error) => {
    if (error) {
      console.error('[NM Calçados] erro ao encerrar servidor:', error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
