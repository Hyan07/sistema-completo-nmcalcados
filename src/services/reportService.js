'use strict';

const{REPORT_DEFINITIONS,definition,publicDefinition}=require('../config/reportDefinitions');
const{HttpError}=require('../utils/httpError');
const{exportLimit,normalizeReportQuery}=require('../utils/reportValidation');

function columnsFor(def){return def.columns.map(([key,label,type,pdfWeight])=>({key,label,type,pdfWeight}));}
function listAvailableReports(permissions=[]){const set=new Set(permissions);if(!set.has('reports.read'))return[];return Object.values(REPORT_DEFINITIONS).filter(item=>set.has(item.domainPermission)).map(publicDefinition);}
function periodLabel(query,def){return def.dateBased?`Período: ${query.dateFrom} a ${query.dateTo}`:'Posição atual';}
async function buildReport(reportKey,rawQuery={}){
  const def=definition(reportKey);if(!def)throw new HttpError(404,'REPORT_NOT_FOUND','Relatório não encontrado.');
  const query=normalizeReportQuery(reportKey,rawQuery),limit=exportLimit(query.format),repository=require('../repositories/reportRepository');
  const repoQuery={...query,limit:limit||query.pageSize,offset:limit?0:query.offset};
  const result=await repository.run(reportKey,repoQuery);
  if(limit&&result.total>limit)throw new HttpError(413,'REPORT_EXPORT_TOO_LARGE',`O resultado possui ${result.total} linhas. Reduza os filtros para exportar no máximo ${limit} linhas em ${query.format.toUpperCase()}.`);
  const report={key:def.key,label:def.label,filters:def.filters,columns:columnsFor(def),rows:result.rows,summary:result.summary||{},total:result.total,periodLabel:periodLabel(query,def),query};
  if(query.format==='json')report.pagination={page:query.page,pageSize:query.pageSize,total:result.total,totalPages:Math.max(1,Math.ceil(result.total/query.pageSize))};
  return report;
}
module.exports={buildReport,listAvailableReports};
