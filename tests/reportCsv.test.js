'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const{buildCsv,escapeCsvCell,protectSpreadsheetFormula}=require('../src/utils/reportCsv');
test('protege fórmula de planilha em texto',()=>{assert.equal(protectSpreadsheetFormula('=2+2'),"'=2+2");assert.equal(protectSpreadsheetFormula('@SUM(A1)'),"'@SUM(A1)");});
test('CSV duplica aspas internas',()=>assert.equal(escapeCsvCell('Tênis "X"'),'"Tênis ""X"""'));
test('CSV inclui BOM e separador ponto e vírgula',()=>{const csv=buildCsv({columns:[{key:'name',label:'Nome',type:'text'},{key:'value',label:'Valor',type:'money'}],rows:[{name:'Produto',value:'10.50'}]});assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Nome";"Valor"'));assert.ok(csv.includes('"10,50"'));});
test('CSV protege conteúdo textual vindo do banco',()=>{const csv=buildCsv({columns:[{key:'name',label:'Nome',type:'text'}],rows:[{name:'-1+cmd'}]});assert.ok(csv.includes("'-1+cmd"));});
test('número negativo permanece numérico no CSV',()=>{const csv=buildCsv({columns:[{key:'change',label:'Variação',type:'integer'}],rows:[{change:-2}]});assert.ok(csv.includes('"-2"'));assert.ok(!csv.includes("'-2"));});
