'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('path');
const {runStaticSecurityChecks}=require('../src/security/staticSecurityChecks');

test('repositório atual não viola os invariantes estáticos de segurança',()=>{
  const findings=runStaticSecurityChecks(path.resolve(__dirname,'..'));
  assert.deepEqual(findings,[],findings.map(item=>`[${item.code}] ${item.file}: ${item.message}`).join('\n'));
});
