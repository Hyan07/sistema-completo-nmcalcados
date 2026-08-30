'use strict';
const { CHECKS } = require('./integrityChecks');

function normalizeSampleLimit(value) {
  const limit = Number(value ?? 20);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('AUDIT_SAMPLE_LIMIT deve ficar entre 1 e 100.');
  return limit;
}
function summarize(results) {
  const summary = { checks: results.length, passed: 0, failed: 0, critical: 0, error: 0, warning: 0, findings: 0 };
  for (const result of results) {
    if (result.count === 0) summary.passed += 1; else summary.failed += 1;
    summary.findings += result.count;
    if (result.count > 0) summary[result.severity.toLowerCase()] += 1;
  }
  return summary;
}
async function runIntegrityAudit(db, { sampleLimit = 20, checks = CHECKS } = {}) {
  const limit = normalizeSampleLimit(sampleLimit);
  const results = [];
  for (const check of checks) {
    const [samples] = await db.execute(check.sql, [limit]);
    const baseSql = check.sql.replace(/\s+LIMIT \?\s*$/i, '');
    const [countRows] = await db.query(`SELECT COUNT(*) total FROM (${baseSql}) integrity_count`);
    results.push({ code: check.code, severity: check.severity, domain: check.domain, description: check.description, count: Number(countRows[0]?.total || 0), samples });
  }
  return { generatedAt: new Date().toISOString(), summary: summarize(results), results };
}
module.exports = { normalizeSampleLimit, runIntegrityAudit, summarize };
