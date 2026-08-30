'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planBuildSteps } = require('../scripts/hostinger-build');

test('build local executa somente verify', () => {
  assert.deepEqual(planBuildSteps({ NODE_ENV: 'development' }), [['run', 'verify']]);
});

test('build de produção não acessa MySQL no ambiente temporário da Hostinger', () => {
  assert.deepEqual(
    planBuildSteps({ NODE_ENV: 'production', ADMIN_PASSWORD: 'senha-temporaria' }),
    [['run', 'verify']]
  );
});

test('redeploy de produção também deixa migrations para o runtime', () => {
  assert.deepEqual(
    planBuildSteps({ NODE_ENV: 'production', ADMIN_PASSWORD: '' }),
    [['run', 'verify']]
  );
});
