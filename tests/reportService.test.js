'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const{listAvailableReports}=require('../src/services/reportService');
test('sem reports.read não expõe catálogo',()=>assert.deepEqual(listAvailableReports(['sales.read']),[]));
test('catálogo respeita permissão do domínio',()=>{const rows=listAvailableReports(['reports.read','sales.read','customers.read']);assert.deepEqual(rows.map(r=>r.key),['sales','customers']);});
