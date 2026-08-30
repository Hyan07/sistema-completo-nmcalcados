'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addDays, inclusiveDays, normalizeDashboardPeriod, percentageChange } = require('../src/utils/dashboardValidation');

test('período padrão usa 30 dias inclusive', () => {
  const p = normalizeDashboardPeriod({}, { today: '2026-08-29' });
  assert.equal(p.dateFrom, '2026-07-31');
  assert.equal(p.dateTo, '2026-08-29');
  assert.equal(p.days, 30);
  assert.equal(p.previousDateFrom, '2026-07-01');
  assert.equal(p.previousDateTo, '2026-07-30');
});

test('período customizado calcula período anterior equivalente', () => {
  const p = normalizeDashboardPeriod({ dateFrom: '2026-08-01', dateTo: '2026-08-07' });
  assert.deepEqual(p, {
    dateFrom: '2026-08-01', dateTo: '2026-08-07', days: 7,
    previousDateFrom: '2026-07-25', previousDateTo: '2026-07-31'
  });
});

test('rejeita intervalo invertido', () => {
  assert.throws(() => normalizeDashboardPeriod({ dateFrom: '2026-08-10', dateTo: '2026-08-01' }), /posterior/);
});

test('rejeita período acima de 366 dias', () => {
  assert.throws(() => normalizeDashboardPeriod({ dateFrom: '2025-01-01', dateTo: '2026-08-01' }), /366/);
});

test('operações de data preservam dias', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(inclusiveDays('2026-02-28', '2026-03-01'), 2);
});

test('percentual calcula crescimento e queda', () => {
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(percentageChange(80, 100), -20);
});

test('percentual sem base anterior não inventa infinito', () => {
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(10, 0), null);
});
