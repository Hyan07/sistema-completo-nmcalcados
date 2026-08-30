'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const{limiter}=require('../src/middlewares/catalogOrderRateLimit');
test('rate limit bloqueia após limite',()=>{const m=limiter({windowMs:60000,max:2,code:'TEST_LIMIT'});const req={ip:'phase15-test'},res={set(){}};let errors=[];m(req,res,e=>errors.push(e||null));m(req,res,e=>errors.push(e||null));m(req,res,e=>errors.push(e||null));assert.equal(errors[0],null);assert.equal(errors[1],null);assert.equal(errors[2].status,429);});
