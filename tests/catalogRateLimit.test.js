'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const{createCatalogRateLimit}=require('../src/middlewares/catalogRateLimit');
function response(){return{headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};}
test('rate limit permite chamadas dentro da janela',()=>{let now=0;const mw=createCatalogRateLimit({max:2,windowMs:1000,now:()=>now});let next=0;mw({ip:'1'},response(),()=>next++);mw({ip:'1'},response(),()=>next++);assert.equal(next,2);});
test('rate limit bloqueia excesso e reinicia após janela',()=>{let now=0;const mw=createCatalogRateLimit({max:1,windowMs:1000,now:()=>now});mw({ip:'1'},response(),()=>{});const r=response();mw({ip:'1'},r,()=>{});assert.equal(r.statusCode,429);now=1001;let ok=false;mw({ip:'1'},response(),()=>ok=true);assert.equal(ok,true);});
