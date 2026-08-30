'use strict';
const { getPool, closePool } = require('../src/config/database');
const { runIntegrityAudit } = require('../src/audit/integrityRunner');

function printReport(report) {
  console.log('\nNM Calçados — Auditoria de Integridade');
  console.log(`Gerado em: ${report.generatedAt}`);
  console.log(`Checks: ${report.summary.checks} | OK: ${report.summary.passed} | Com achados: ${report.summary.failed} | Registros: ${report.summary.findings}`);
  for (const item of report.results) {
    const marker = item.count ? 'FALHA' : 'OK';
    console.log(`\n[${marker}] ${item.severity} ${item.code} — ${item.description}`);
    if (item.count) {
      console.log(`Achados: ${item.count}`);
      console.table(item.samples);
    }
  }
}
(async()=>{
  try {
    const report = await runIntegrityAudit(getPool(), { sampleLimit: process.env.AUDIT_SAMPLE_LIMIT || 20 });
    printReport(report);
    if (report.summary.critical > 0 || report.summary.error > 0) process.exitCode = 2;
  } catch (error) {
    console.error('[audit:integrity] Falha ao executar auditoria:', error.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(()=>{});
  }
})();
