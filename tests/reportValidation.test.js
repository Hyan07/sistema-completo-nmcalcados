'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const{exportLimit,normalizeReportQuery,safeReportFilename}=require('../src/utils/reportValidation');

test('relatório temporal usa últimos 30 dias por padrão',()=>{const q=normalizeReportQuery('sales',{}, {today:'2026-08-29'});assert.equal(q.dateFrom,'2026-07-31');assert.equal(q.dateTo,'2026-08-29');});
test('relatório sem período não inventa datas',()=>{const q=normalizeReportQuery('stock',{});assert.equal(q.dateFrom,null);assert.equal(q.dateTo,null);});
test('rejeita intervalo invertido',()=>assert.throws(()=>normalizeReportQuery('cash',{dateFrom:'2026-08-30',dateTo:'2026-08-29'}),e=>e.code==='INVALID_REPORT_RANGE'));
test('valida status por domínio',()=>{assert.equal(normalizeReportQuery('sales',{status:'completed'}).status,'COMPLETED');assert.throws(()=>normalizeReportQuery('sales',{status:'OPEN'}),e=>e.code==='INVALID_REPORT_FILTER');});
test('limites de exportação são explícitos',()=>{assert.equal(exportLimit('csv'),5000);assert.equal(exportLimit('pdf'),1500);assert.equal(exportLimit('json'),null);});
test('nome de arquivo é sanitizado',()=>assert.equal(safeReportFilename('Posição de Estoque','2026-08-01','2026-08-29','csv'),'posicao-de-estoque-2026-08-01-a-2026-08-29.csv'));
