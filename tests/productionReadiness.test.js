'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const{validateProductionEnvironment}=require('../src/deploy/productionReadiness');
function valid(overrides={}){return{NODE_ENV:'production',APP_ORIGIN:'https://loja.example',DB_HOST:'localhost',DB_NAME:'nm_prod',DB_USER:'nm_app',DB_PASSWORD:'senha-nao-placeholder-123',SESSION_SECRET:'x'.repeat(48),DB_PORT:'3306',DB_CONNECTION_LIMIT:'10',ADMIN_PASSWORD:'',...overrides};}
test('production readiness accepts secure environment',()=>assert.equal(validateProductionEnvironment(valid()).ok,true));
test('production readiness rejects http origin and placeholder secrets',()=>{const r=validateProductionEnvironment(valid({APP_ORIGIN:'http://loja.example',DB_PASSWORD:'troque-esta-senha'}));assert.equal(r.ok,false);assert.ok(r.errors.some(x=>x.includes('HTTPS')));assert.ok(r.errors.some(x=>x.includes('DB_PASSWORD')));});
test('production readiness rejects retained bootstrap password',()=>{const r=validateProductionEnvironment(valid({ADMIN_PASSWORD:'temporaria'}));assert.equal(r.ok,false);assert.ok(r.errors.some(x=>x.includes('ADMIN_PASSWORD')));});
