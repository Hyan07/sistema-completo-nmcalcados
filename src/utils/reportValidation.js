'use strict';

const { HttpError } = require('./httpError');
const { definition } = require('../config/reportDefinitions');

const FORMATS=new Set(['json','csv','pdf']);
const BOOLEAN_FILTERS=new Set(['1','0','true','false']);
const SALES_STATUS=new Set(['DRAFT','COMPLETED','CANCELLED','PARTIALLY_RETURNED','RETURNED']);
const PURCHASE_STATUS=new Set(['DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED']);
const CASH_STATUS=new Set(['OPEN','CLOSED']);
const FINANCE_STATUS=new Set(['OPEN','PARTIAL','PAID','CANCELLED']);
const STOCK_STATUS=new Set(['OK','LOW_STOCK','OUT_OF_STOCK','INACTIVE','INACTIVE_WITH_STOCK']);
const FINANCE_TYPES=new Set(['RECEIVABLE','PAYABLE']);
function businessToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function addDays(dateString,days){const date=new Date(`${dateString}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
function parseDate(value,label){const text=String(value??'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new HttpError(400,'INVALID_REPORT_DATE',`${label} inválida.`);const date=new Date(`${text}T12:00:00Z`);if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==text)throw new HttpError(400,'INVALID_REPORT_DATE',`${label} inválida.`);return text;}
function inclusiveDays(from,to){return Math.floor((new Date(`${to}T12:00:00Z`)-new Date(`${from}T12:00:00Z`))/86400000)+1;}
function normalizeFormat(value){const f=String(value||'json').trim().toLowerCase();if(!FORMATS.has(f))throw new HttpError(400,'INVALID_REPORT_FORMAT','Formato deve ser json, csv ou pdf.');return f;}
function normalizeText(value,max=190){const v=String(value??'').trim();return v?v.slice(0,max):null;}
function normalizeEnum(value,allowed,label){const v=String(value??'').trim().toUpperCase();if(!v)return null;if(!allowed.has(v))throw new HttpError(400,'INVALID_REPORT_FILTER',`${label} inválido.`);return v;}
function normalizeBoolean(value){const v=String(value??'').trim().toLowerCase();if(!v)return null;if(!BOOLEAN_FILTERS.has(v))throw new HttpError(400,'INVALID_REPORT_FILTER','Filtro de ativo inválido.');return v==='1'||v==='true';}
function positiveInt(value,fallback,max,label){if(value===undefined||value===null||value==='')return fallback;const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>max)throw new HttpError(400,'INVALID_REPORT_PAGINATION',`${label} inválido.`);return n;}
function normalizeReportQuery(reportKey,input={},{today=businessToday()}={}){
  const def=definition(reportKey);if(!def)throw new HttpError(404,'REPORT_NOT_FOUND','Relatório não encontrado.');
  const format=normalizeFormat(input.format),page=positiveInt(input.page,1,100000,'Página'),pageSize=positiveInt(input.pageSize,50,100,'Tamanho da página');
  let dateFrom=null,dateTo=null;if(def.dateBased){dateTo=input.dateTo?parseDate(input.dateTo,'Data final'):parseDate(today,'Data final');dateFrom=input.dateFrom?parseDate(input.dateFrom,'Data inicial'):addDays(dateTo,-29);if(dateFrom>dateTo)throw new HttpError(400,'INVALID_REPORT_RANGE','A data inicial não pode ser posterior à data final.');if(inclusiveDays(dateFrom,dateTo)>3660)throw new HttpError(400,'REPORT_RANGE_TOO_LARGE','O relatório aceita no máximo 10 anos por consulta.');}
  const status=reportKey==='sales'?normalizeEnum(input.status,SALES_STATUS,'Status da venda'):reportKey==='purchases'?normalizeEnum(input.status,PURCHASE_STATUS,'Status da compra'):reportKey==='cash'?normalizeEnum(input.status,CASH_STATUS,'Status do caixa'):reportKey==='finance'?normalizeEnum(input.status,FINANCE_STATUS,'Status financeiro'):null;
  return{format,page,pageSize,offset:(page-1)*pageSize,q:normalizeText(input.q),dateFrom,dateTo,status,isActive:normalizeBoolean(input.isActive),stockStatus:normalizeEnum(input.stockStatus,STOCK_STATUS,'Situação de estoque'),movementType:normalizeText(input.movementType,60)?.toUpperCase()||null,financeType:normalizeEnum(input.financeType,FINANCE_TYPES,'Tipo financeiro')};
}
function exportLimit(format){return format==='pdf'?1500:format==='csv'?5000:null;}
function safeReportFilename(label,dateFrom,dateTo,extension){const base=String(label||'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'relatorio';const period=dateFrom&&dateTo?`-${dateFrom}-a-${dateTo}`:'';return`${base}${period}.${extension}`;}
module.exports={addDays,businessToday,exportLimit,inclusiveDays,normalizeReportQuery,safeReportFilename};
