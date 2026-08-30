'use strict';
const reportService=require('../services/reportService');
const{createAuditLog}=require('../repositories/auditRepository');
const{buildCsv}=require('../utils/reportCsv');
const{safeReportFilename}=require('../utils/reportValidation');
async function catalog(req,res,next){try{res.setHeader('Cache-Control','no-store');res.json({data:reportService.listAvailableReports(req.authPermissions||[])});}catch(error){next(error);}}
function handle(reportKey){return async function reportHandler(req,res,next){try{const report=await reportService.buildReport(reportKey,req.query);res.setHeader('Cache-Control','no-store');if(report.query.format==='json')return res.json({data:report});await createAuditLog({userId:req.user.id,actionCode:'REPORT_EXPORTED',entityType:'REPORT',entityId:reportKey,newData:{format:report.query.format,dateFrom:report.query.dateFrom,dateTo:report.query.dateTo,totalRows:report.total}});if(report.query.format==='csv'){const filename=safeReportFilename(report.label,report.query.dateFrom,report.query.dateTo,'csv');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);return res.send(buildCsv(report));}const{createReportPdf}=require('../utils/reportPdf');const filename=safeReportFilename(report.label,report.query.dateFrom,report.query.dateTo,'pdf');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);createReportPdf(report,res);return undefined;}catch(error){return next(error);}};}
module.exports={catalog,handle};
