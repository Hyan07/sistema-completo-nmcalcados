'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {getDefinition,templateCsv}=require('../src/config/importDefinitions');
test('expõe quatro modelos oficiais',()=>{for(const t of ['catalog','customers','suppliers','opening_stock'])assert.ok(getDefinition(t));});
test('template usa BOM, cabeçalho e exemplo',()=>{const csv=templateCsv('opening_stock');assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/"sku";"quantity";"reason"/);});
