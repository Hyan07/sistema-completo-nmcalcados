'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {consumeCatalogReservationForMovement}=require('../src/repositories/stockRepository');
test('consumo de reserva é vinculado ao movementId exato',async()=>{
  const calls=[]; const con={execute:async(sql,params)=>{calls.push({sql,params}); if(calls.length===1)return [[{catalog_order_id:9,created_by_user_id:4}]]; return [{affectedRows:1}];}};
  const orderId=await consumeCatalogReservationForMovement(77,12,con);
  assert.equal(orderId,9); assert.deepEqual(calls[0].params,[77,12]); assert.match(calls[0].sql,/sm\.id=\?/); assert.match(calls[0].sql,/smt\.code='SALE'/);
});
test('movimento que não pertence a venda convertida não consome reserva',async()=>{
  let calls=0; const con={execute:async()=>{calls++;return [[]];}};
  assert.equal(await consumeCatalogReservationForMovement(88,12,con),null); assert.equal(calls,1);
});
