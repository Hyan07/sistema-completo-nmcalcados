'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {assertReversalDuplicate,assertSettlementDuplicate,sameNullableId}=require('../src/middlewares/financeIdempotencyGuard');
test('ids nulos equivalem apenas a nulo/zero',()=>{assert.equal(sameNullableId(null,null),true);assert.equal(sameNullableId(null,2),false);});
test('liquidação duplicada idêntica é aceita',()=>{assert.doesNotThrow(()=>assertSettlementDuplicate({amount:'10.00',payment_method_id:2,cash_session_id:null},{receivable_id:7},7,{amount:'10.00',paymentMethodId:2,cashSessionId:null},'RECEIPT'));});
test('liquidação com mesma chave e conta diferente é rejeitada',()=>{assert.throws(()=>assertSettlementDuplicate({amount:'10.00',payment_method_id:2,cash_session_id:null},{receivable_id:8},7,{amount:'10.00',paymentMethodId:2,cashSessionId:null},'RECEIPT'),e=>e.code==='FINANCE_OPERATION_KEY_REUSED');});
test('liquidação com valor ou método diferente é rejeitada',()=>{assert.throws(()=>assertSettlementDuplicate({amount:'10.00',payment_method_id:2,cash_session_id:null},{payable_id:7},7,{amount:'11.00',paymentMethodId:2,cashSessionId:null},'DISBURSEMENT'));});
test('estorno duplicado exige mesma entidade e motivo',()=>{assert.doesNotThrow(()=>assertReversalDuplicate({id:4,reversal_reason:'Erro operacional'},4,{reason:'Erro operacional'}));assert.throws(()=>assertReversalDuplicate({id:4,reversal_reason:'Erro operacional'},5,{reason:'Erro operacional'}));});
