'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planBuildSteps } = require('../scripts/hostinger-build');

test('build local executa somente verify', () => {
  assert.deepEqual(planBuildSteps({ NODE_ENV: 'development' }), [['run', 'verify']]);
});

test('primeiro build de produção aplica migrations e bootstrap', () => {
  assert.deepEqual(planBuildSteps({ NODE_ENV: 'production', ADMIN_PASSWORD: 'senha-temporaria' }), [
    ['run', 'verify'],
    ['run', 'db:migrate'],
    ['run', 'auth:bootstrap-admin']
  ]);
});

test('redeploy normal aplica migrations e deploy check sem bootstrap', () => {
  assert.deepEqual(planBuildSteps({ NODE_ENV: 'production', ADMIN_PASSWORD: '' }), [
    ['run', 'verify'],
    ['run', 'db:migrate'],
    ['run', 'deploy:check']
  ]);
});
