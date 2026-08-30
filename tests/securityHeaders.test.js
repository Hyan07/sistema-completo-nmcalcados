'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {apiCachePolicy,buildContentSecurityPolicy,securityHeaders}=require('../src/middlewares/securityHeaders');

test('CSP bloqueia framing, plugins e scripts externos por padrão',()=>{
  const csp=buildContentSecurityPolicy();
  assert.match(csp,/default-src 'self'/);
  assert.match(csp,/frame-ancestors 'none'/);
  assert.match(csp,/object-src 'none'/);
  assert.match(csp,/script-src 'self'/);
});

test('CSP de produção força upgrade de HTTP',()=>assert.match(buildContentSecurityPolicy({production:true}),/upgrade-insecure-requests/));

test('securityHeaders define proteções HTTP centrais',()=>{
  const headers={}; let nextCalled=false;
  securityHeaders({}, {setHeader:(k,v)=>{headers[k]=v;}}, ()=>{nextCalled=true;});
  assert.equal(headers['X-Frame-Options'],'DENY');
  assert.equal(headers['X-Content-Type-Options'],'nosniff');
  assert.equal(headers['Referrer-Policy'],'no-referrer');
  assert.equal(nextCalled,true);
});

test('apiCachePolicy marca API como no-store',()=>{const headers={};apiCachePolicy({}, {setHeader:(k,v)=>headers[k]=v},()=>{});assert.equal(headers['Cache-Control'],'no-store');});
