'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeOrigin,requestOrigin,requireTrustedOrigin,sourceOrigin}=require('../src/middlewares/requestOriginGuard');
function req(overrides={}){const headers=Object.fromEntries(Object.entries(overrides.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));return{method:'POST',protocol:'https',headers,session:{auth:{userId:7}},get(name){return headers[name.toLowerCase()]||null;},...overrides,headers};}
function run(r){return new Promise(resolve=>requireTrustedOrigin(r,{},error=>resolve(error||null)));}

test('normalizeOrigin aceita somente origem http/https',()=>{
  assert.equal(normalizeOrigin('https://loja.example.com/path'),'https://loja.example.com');
  assert.equal(normalizeOrigin('javascript:alert(1)'),null);
  assert.equal(normalizeOrigin('null'),null);
});

test('requestOrigin deriva protocolo e Host quando APP_ORIGIN não está configurado',()=>assert.equal(requestOrigin(req({headers:{host:'loja.test'}})),'https://loja.test'));

test('sourceOrigin prioriza Origin e aceita Referer como fallback',()=>{
  assert.equal(sourceOrigin(req({headers:{host:'loja.test',origin:'https://loja.test'}})),'https://loja.test');
  assert.equal(sourceOrigin(req({headers:{host:'loja.test',referer:'https://loja.test/pdv'}})),'https://loja.test');
});

test('GET não exige validação de origem',async()=>assert.equal(await run(req({method:'GET',headers:{host:'loja.test'}})),null));

test('mutação autenticada same-origin é aceita',async()=>assert.equal(await run(req({headers:{host:'loja.test',origin:'https://loja.test'}})),null));

test('mutação autenticada cross-origin é bloqueada',async()=>{
  const error=await run(req({headers:{host:'loja.test',origin:'https://evil.test'}}));
  assert.equal(error.status,403); assert.equal(error.code,'UNTRUSTED_REQUEST_ORIGIN');
});

test('mutação autenticada sem origem é bloqueada',async()=>{
  const error=await run(req({headers:{host:'loja.test'}}));
  assert.equal(error.status,403); assert.equal(error.code,'REQUEST_ORIGIN_REQUIRED');
});

test('API pública sem cookie pode ser usada por cliente não-browser',async()=>{
  const r=req({headers:{host:'loja.test'},session:{}});
  assert.equal(await run(r),null);
});

test('Sec-Fetch-Site cross-site é rejeitado mesmo sem Origin',async()=>{
  const error=await run(req({headers:{host:'loja.test','sec-fetch-site':'cross-site'},session:{}}));
  assert.equal(error.code,'UNTRUSTED_REQUEST_ORIGIN');
});
