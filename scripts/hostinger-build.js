'use strict';

const { spawnSync } = require('child_process');

function planBuildSteps() {
  // O ambiente de build gerenciado da Hostinger não é o runtime da aplicação.
  // Acesso ao MySQL e bootstrap são executados pelo server.js antes do Express iniciar.
  return [['run', 'verify']];
}

function runNpm(args) {
  const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(executable, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function main() {
  const steps = planBuildSteps();
  const production = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

  console.log(`[NM Calçados] build ${production ? 'de produção' : 'local'} iniciado.`);
  for (const args of steps) {
    console.log(`[NM Calçados] executando: npm ${args.join(' ')}`);
    runNpm(args);
  }

  if (production) {
    console.log('[NM Calçados] build validado. Migrations e bootstrap serão executados no runtime antes do Express iniciar.');
  }
}

if (require.main === module) main();

module.exports = { planBuildSteps };
