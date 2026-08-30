'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {CHECKS,validateCheckDefinition}=require('../src/audit/integrityChecks');
const {normalizeSampleLimit,summarize}=require('../src/audit/integrityRunner');
test('todas as definições de auditoria são SELECT limitadas e têm código único',()=>{
  assert.ok(CHECKS.length>=15); assert.equal(new Set(CHECKS.map(c=>c.code)).size,CHECKS.length);
  for(const check of CHECKS)assert.equal(validateCheckDefinition(check),true,check.code);
});
test('limite de amostras é estrito',()=>{assert.equal(normalizeSampleLimit(20),20);assert.throws(()=>normalizeSampleLimit(0));assert.throws(()=>normalizeSampleLimit(101));});
test('sumário separa checks e quantidade de achados',()=>{const s=summarize([{count:0,severity:'CRITICAL'},{count:3,severity:'CRITICAL'},{count:2,severity:'ERROR'}]);assert.deepEqual(s,{checks:3,passed:1,failed:2,critical:1,error:1,warning:0,findings:5});});
test('runner preserva ORDER BY interno ao montar a contagem',async()=>{const queries=[];const db={execute:async(sql)=>{queries.push(sql);return[[]];},query:async(sql)=>{queries.push(sql);return[[{total:0}]];}};const {runIntegrityAudit}=require('../src/audit/integrityRunner');await runIntegrityAudit(db,{sampleLimit:5,checks:[{code:'WINDOW_TEST',severity:'ERROR',domain:'x',description:'x',sql:'SELECT id,LAG(v) OVER (ORDER BY id) p FROM t ORDER BY id LIMIT ?'}]});assert.match(queries[1],/LAG\(v\) OVER \(ORDER BY id\)/);assert.doesNotMatch(queries[1],/LIMIT \?/);});
