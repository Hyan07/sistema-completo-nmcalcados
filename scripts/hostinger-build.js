'use strict';

const { spawnSync } = require('child_process');

function planBuildSteps(env = process.env) {
  const production = String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const hasBootstrapPassword = Boolean(String(env.ADMIN_PASSWORD || '').trim());

  const steps = [['run', 'verify']];
  if (!production) return steps;

  steps.push(['run', 'db:migrate']);
  if (hasBootstrapPassword) {
    steps.push(['run', 'auth:bootstrap-admin']);
  } else {
    steps.push(['run', 'deploy:check']);
  }
  return steps;
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

  if (production && String(process.env.ADMIN_PASSWORD || '').trim()) {
    console.warn('[NM Calçados] primeiro bootstrap concluído/validado. Remova ADMIN_PASSWORD do ambiente antes do próximo redeploy.');
  }
}

if (require.main === module) main();

module.exports = { planBuildSteps };
