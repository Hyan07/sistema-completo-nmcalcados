'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {requestContext}=require('../src/middlewares/requestContext');
test('requestContext gera ID novo e não reutiliza cabeçalho fornecido pelo cliente',()=>{const headers={};const req={headers:{'x-request-id':'attacker-value'}};requestContext(req,{setHeader:(k,v)=>headers[k]=v},()=>{});assert.match(req.requestId,/^[0-9a-f-]{36}$/);assert.notEqual(req.requestId,'attacker-value');assert.equal(headers['X-Request-Id'],req.requestId);});
