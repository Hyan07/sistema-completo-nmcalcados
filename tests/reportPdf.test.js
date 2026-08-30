'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const{short}=require('../src/utils/reportPdf');
test('texto longo do PDF é truncado sem quebrar layout',()=>{const value=short('Produto com uma descrição extremamente longa para uma célula de relatório',30);assert.equal(value.length,30);assert.ok(value.endsWith('...'));});
