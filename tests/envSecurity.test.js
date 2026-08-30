'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseAppOrigin}=require('../src/config/env');

test('APP_ORIGIN normaliza para origin',()=>assert.equal(parseAppOrigin('https://www.nmcalcados.test/'),'https://www.nmcalcados.test'));
test('APP_ORIGIN recusa protocolo inseguro não HTTP e credenciais',()=>{
  assert.throws(()=>parseAppOrigin('ftp://nm.test'));
  assert.throws(()=>parseAppOrigin('https://user:pass@nm.test'));
  assert.throws(()=>parseAppOrigin('https://nm.test/app'));
});
