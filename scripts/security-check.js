'use strict';

const { runStaticSecurityChecks } = require('../src/security/staticSecurityChecks');

const findings = runStaticSecurityChecks(process.cwd());
if (!findings.length) {
  console.log('[NM Calçados] security:check OK — nenhuma regressão arquitetural conhecida foi detectada.');
  process.exitCode = 0;
} else {
  console.error(`[NM Calçados] security:check encontrou ${findings.length} problema(s):`);
  for (const item of findings) console.error(`- [${item.code}] ${item.file}: ${item.message}`);
  process.exitCode = 2;
}
