'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateNewBalance,
  normalizeInventoryCount,
  normalizeManualMovement,
  stockStatus
} = require('../src/utils/stockValidation');

test('entrada soma ao saldo e saída subtrai', () => {
  assert.deepEqual(calculateNewBalance(10, 'IN', 3), { quantityChange: 3, newQuantity: 13 });
  assert.deepEqual(calculateNewBalance(10, 'OUT', 3), { quantityChange: -3, newQuantity: 7 });
});

test('saída não permite estoque negativo', () => {
  assert.throws(() => calculateNewBalance(2, 'OUT', 3), /Estoque insuficiente/);
});

test('movimentação manual exige tipo permitido, quantidade, motivo e chave idempotente', () => {
  const value = normalizeManualMovement({
    typeCode: 'manual_entry', quantity: 4, reason: 'Recebimento avulso conferido', operationKey: '12345678-1234-1234-1234-123456789012'
  });
  assert.equal(value.typeCode, 'MANUAL_ENTRY');
  assert.equal(value.quantity, 4);
  assert.throws(() => normalizeManualMovement({ typeCode: 'SALE', quantity: 1, reason: 'Teste', operationKey: '12345678-1234-1234-1234-123456789012' }), /Tipo de movimentação/);
});

test('contagem permite saldo zero e exige justificativa', () => {
  const value = normalizeInventoryCount({ countedQuantity: 0, reason: 'Inventário físico', operationKey: '12345678-1234-1234-1234-123456789012' });
  assert.equal(value.countedQuantity, 0);
  assert.throws(() => normalizeInventoryCount({ countedQuantity: 1, reason: '', operationKey: '12345678-1234-1234-1234-123456789012' }), /motivo/);
});

test('status diferencia ruptura, baixo estoque, normal e inativo com saldo', () => {
  assert.equal(stockStatus({ quantity: 0, minimumStock: 2, active: true }), 'OUT_OF_STOCK');
  assert.equal(stockStatus({ quantity: 2, minimumStock: 2, active: true }), 'LOW_STOCK');
  assert.equal(stockStatus({ quantity: 3, minimumStock: 2, active: true }), 'OK');
  assert.equal(stockStatus({ quantity: 3, minimumStock: 2, active: false }), 'INACTIVE_WITH_STOCK');
});
