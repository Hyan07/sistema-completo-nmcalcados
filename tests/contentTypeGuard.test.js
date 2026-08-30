'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {apiContentTypeGuard,hasRequestBody}=require('../src/middlewares/contentTypeGuard');
function run(request){return new Promise(resolve=>apiContentTypeGuard(request,{},error=>resolve(error||null)));}

test('detecta corpo por Content-Length ou transfer-encoding',()=>{
  assert.equal(hasRequestBody({headers:{'content-length':'5'}}),true);
  assert.equal(hasRequestBody({headers:{'transfer-encoding':'chunked'}}),true);
  assert.equal(hasRequestBody({headers:{}}),false);
});

test('GET não exige Content-Type',async()=>assert.equal(await run({method:'GET',headers:{}}),null));
test('JSON, form e multipart são aceitos',async()=>{
  for(const type of ['application/json','application/x-www-form-urlencoded','multipart/form-data; boundary=x']){
    assert.equal(await run({method:'POST',headers:{'content-length':'10','content-type':type}}),null);
  }
});
test('text/plain com corpo é rejeitado',async()=>{
  const error=await run({method:'POST',headers:{'content-length':'10','content-type':'text/plain'}});
  assert.equal(error.status,415);assert.equal(error.code,'UNSUPPORTED_CONTENT_TYPE');
});
