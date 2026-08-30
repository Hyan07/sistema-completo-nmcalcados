'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApiRateLimit}=require('../src/middlewares/apiRateLimit');
function call(middleware,ip='1.2.3.4'){const headers={};return new Promise(resolve=>middleware({ip},{setHeader:(k,v)=>headers[k]=v},error=>resolve({error:error||null,headers})));}

test('rate limit permite chamadas dentro do limite',async()=>{
  let now=1000;const mw=createApiRateLimit({windowMs:1000,max:2,now:()=>now});
  assert.equal((await call(mw)).error,null);assert.equal((await call(mw)).error,null);
});

test('rate limit rejeita excesso e envia Retry-After',async()=>{
  const mw=createApiRateLimit({windowMs:1000,max:1,now:()=>1000});await call(mw);const result=await call(mw);
  assert.equal(result.error.status,429);assert.equal(result.error.code,'API_RATE_LIMIT');assert.equal(result.headers['Retry-After'],'1');
});

test('rate limit separa IPs',async()=>{
  const mw=createApiRateLimit({windowMs:1000,max:1,now:()=>1000});await call(mw,'a');assert.equal((await call(mw,'b')).error,null);
});

test('rate limit reinicia após a janela',async()=>{
  let now=1000;const mw=createApiRateLimit({windowMs:1000,max:1,now:()=>now});await call(mw);now=2001;assert.equal((await call(mw)).error,null);
});
