'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildAlerts,moneyNet}=require('../src/services/dashboardService');

test('fluxo líquido mantém centavos exatos',()=>{
  assert.equal(moneyNet('100.10','0.20'),'99.90');
  assert.equal(moneyNet('10.00','25.35'),'-15.35');
});

test('sem ocorrências não gera alertas artificiais',()=>{
  const alerts=buildAlerts({stock:{out_of_stock_skus:0,low_stock_skus:0},finance:{receivable_overdue:'0.00',payable_overdue:'0.00'},purchases:{pending_purchases:0},cashDifferences:{sessions_with_difference:0,absolute_difference:'0.00'}});
  assert.deepEqual(alerts,[]);
});

test('alertas refletem ruptura vencimentos compras e caixa',()=>{
  const alerts=buildAlerts({stock:{out_of_stock_skus:2,low_stock_skus:3},finance:{receivable_overdue:'150.00',payable_overdue:'80.00'},purchases:{pending_purchases:4},cashDifferences:{sessions_with_difference:1,absolute_difference:'5.00'}});
  assert.deepEqual(alerts.map(a=>a.code),['OUT_OF_STOCK','LOW_STOCK','OVERDUE_RECEIVABLES','OVERDUE_PAYABLES','PENDING_PURCHASES','CASH_DIFFERENCE']);
});
