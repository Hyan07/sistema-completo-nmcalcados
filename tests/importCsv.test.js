'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {parseCsv,detectDelimiter,canonicalHeader}=require('../src/utils/importCsv');
test('detecta ponto e vírgula e BOM',()=>{const b=Buffer.from('\uFEFFnome;sku\r\n"Tênis; Casual";ABC-38\r\n');const p=parseCsv(b);assert.equal(p.delimiter,';');assert.equal(p.rows[0].data.nome,'Tênis; Casual');});
test('suporta vírgula, aspas escapadas e quebra dentro de campo',()=>{const p=parseCsv(Buffer.from('name,notes\n"Cliente","linha 1\nlinha 2 com ""aspas"""\n'));assert.equal(p.rows[0].data.notes,'linha 1\nlinha 2 com "aspas"');});
test('normaliza cabeçalho acentuado',()=>assert.equal(canonicalHeader('Preço de Venda'),'preco_de_venda'));
test('rejeita arquivo binário',()=>assert.throws(()=>parseCsv(Buffer.from([0,1,2,3])),/CSV|arquivo/i));
test('detecta tabulação',()=>assert.equal(detectDelimiter('a\tb\n1\t2\n'),'\t'));
