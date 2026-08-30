'use strict';
function displayValue(value,type){if(value===null||value===undefined)return'';if(type==='boolean')return Number(value)===1||value===true?'Sim':'Não';if(type==='money')return Number(value||0).toFixed(2).replace('.',',');if(type==='datetime'){const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});}if(type==='date'){const s=String(value).slice(0,10),[y,m,d]=s.split('-');return y&&m&&d?`${d}/${m}/${y}`:String(value);}return String(value);}
function protectSpreadsheetFormula(value){const text=String(value??'');return/^[=+\-@]/.test(text)?`'${text}`:text;}
function quoteCsv(value){return`"${String(value??'').replace(/"/g,'""')}"`;}
function escapeCsvCell(value){return quoteCsv(protectSpreadsheetFormula(value));}
function buildCsv(report){const columns=report.columns,lines=[columns.map(c=>escapeCsvCell(c.label)).join(';')];for(const row of report.rows){lines.push(columns.map(c=>{const value=displayValue(row[c.key],c.type);return c.type==='text'?escapeCsvCell(value):quoteCsv(value);}).join(';'));}return`\uFEFF${lines.join('\r\n')}\r\n`;}
module.exports={buildCsv,displayValue,escapeCsvCell,protectSpreadsheetFormula,quoteCsv};
