'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const v=require('../src/utils/cashPaymentValidation');

test('converte dinheiro para centavos sem float',()=>{assert.equal(v.moneyToCents('149.90'),14990);assert.equal(v.moneyToCents('0,01'),1);});
test('formata centavos positivos e negativos',()=>{assert.equal(v.centsToMoney(150),'1.50');assert.equal(v.centsToMoney(-50),'-0.50');});
test('divide parcelas preservando soma exata',()=>{const parts=v.splitInstallments('100.00',3);assert.deepEqual(parts,['33.34','33.33','33.33']);assert.equal(v.sumMoney(parts),10000);});
test('adiciona meses respeitando último dia',()=>{assert.equal(v.addMonths('2026-01-31',1),'2026-02-28');assert.equal(v.addMonths('2026-01-31',2),'2026-03-31');});
test('normaliza caixa',()=>{assert.deepEqual(v.normalizeRegister({code:'pdv-01',name:'Caixa principal'}),{code:'PDV-01',name:'Caixa principal',isActive:true});});
test('normaliza abertura e fechamento',()=>{const key='cash-open:1234567890abcdef';assert.equal(v.normalizeOpenSession({cashRegisterId:2,openingBalance:'12.34',operationKey:key}).openingBalance,'12.34');assert.equal(v.normalizeCloseSession({declaredClosingBalance:'20',operationKey:'cash-close:1234567890abcdef'}).declaredClosingBalance,'20.00');});
test('movimento manual exige motivo',()=>{assert.throws(()=>v.normalizeManualCashMovement({typeCode:'CASH_SUPPLY',amount:'10',reason:'x',operationKey:'cash-move:1234567890abcdef'}),/motivo/i);});
test('normaliza lote com múltiplos pagamentos',()=>{const p=v.normalizePaymentRequest({operationKey:'sale-pay:1234567890abcdef',cashSessionId:3,payments:[{paymentMethodId:1,amount:'50',installments:1},{paymentMethodId:4,amount:'150.00',installments:3}]});assert.equal(p.payments.length,2);assert.equal(v.sumMoney(p.payments.map(x=>x.amount)),20000);});
test('rejeita parcelamento fora do limite estrutural',()=>{assert.throws(()=>v.normalizePaymentRequest({operationKey:'sale-pay:1234567890abcdef',payments:[{paymentMethodId:4,amount:'100',installments:13}]}),/Parcelas/);});
test('gera chave determinística de 64 caracteres',()=>{const a=v.derivedKey('abc','receipt',1),b=v.derivedKey('abc','receipt',1);assert.equal(a,b);assert.equal(a.length,64);});
test('chave de operação curta é rejeitada',()=>{assert.throws(()=>v.normalizeOperationKey('curta'),/chave/i);});
