'use strict';

const fs = require('fs');
const path = require('path');

function readUtf8(filePath) { return fs.readFileSync(filePath, 'utf8'); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
function finding(code, file, message) { return { code, file, message }; }

function runStaticSecurityChecks(root = process.cwd()) {
  const findings = [];
  const srcDir = path.join(root, 'src');
  const publicJsDir = path.join(root, 'public', 'js');
  const scannedJs = [...walk(srcDir), ...walk(publicJsDir)].filter((file) => file.endsWith('.js'));

  for (const file of scannedJs) {
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const text = readUtf8(file);
    if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) findings.push(finding('DYNAMIC_CODE_EXECUTION', relative, 'Uso de eval/new Function não é permitido.'));
    if (/require\s*\(\s*['"]child_process['"]\s*\)/.test(text) || /from\s+['"]node:child_process['"]/.test(text)) findings.push(finding('CHILD_PROCESS_IN_APP', relative, 'child_process não deve ser usado no código da aplicação web.'));
  }

  const dbFile = path.join(root, 'src', 'config', 'database.js');
  if (fs.existsSync(dbFile)) {
    const dbText = readUtf8(dbFile);
    if (!/getDatabaseConfig\s*\(\s*\{\s*multipleStatements\s*=\s*false\s*\}/.test(dbText)) findings.push(finding('DB_MULTIPLE_STATEMENTS_DEFAULT', 'src/config/database.js', 'A conexão padrão precisa manter multipleStatements=false.'));
  }

  const routeDir = path.join(root, 'src', 'routes');
  const publicExceptions = new Set(['authRoutes.js', 'publicCatalogRoutes.js', 'gradeRoutes.js', 'healthRoutes.js']);
  for (const file of walk(routeDir).filter((item) => item.endsWith('Routes.js'))) {
    const name = path.basename(file);
    if (publicExceptions.has(name)) continue;
    const text = readUtf8(file);
    if (!/\bauthenticate\b/.test(text)) findings.push(finding('ADMIN_ROUTE_WITHOUT_AUTH', `src/routes/${name}`, 'Rota administrativa sem referência ao middleware authenticate.'));
  }

  const productRoutesFile = path.join(routeDir, 'productRoutes.js');
  if (fs.existsSync(productRoutesFile)) {
    const text = readUtf8(productRoutesFile);
    if (!/router\.use\(authenticate\)/.test(text) || !/router\.use\(['"]\/:productId\/grade['"],\s*gradeRoutes\)/.test(text)) findings.push(finding('NESTED_GRADE_AUTH_MISSING', 'src/routes/productRoutes.js', 'gradeRoutes deve permanecer montado após authenticate no productRoutes.'));
  }

  const publicCatalogFile = path.join(routeDir, 'publicCatalogRoutes.js');
  if (fs.existsSync(publicCatalogFile)) {
    const text = readUtf8(publicCatalogFile);
    for (const required of ['catalogRateLimit', 'catalogOrderCreateRateLimit', 'catalogOrderTrackRateLimit']) if (!text.includes(required)) findings.push(finding('PUBLIC_RATE_LIMIT_MISSING', 'src/routes/publicCatalogRoutes.js', `Proteção pública ausente: ${required}.`));
  }

  const authFile = path.join(routeDir, 'authRoutes.js');
  if (fs.existsSync(authFile)) {
    const text = readUtf8(authFile);
    if (!text.includes('loginRateLimit')) findings.push(finding('LOGIN_RATE_LIMIT_MISSING', 'src/routes/authRoutes.js', 'Login precisa permanecer protegido por rate limit.'));
    if (!/router\.post\(['"]\/logout['"],\s*authenticate/.test(text)) findings.push(finding('LOGOUT_WITHOUT_AUTH', 'src/routes/authRoutes.js', 'Logout precisa exigir sessão autenticada.'));
  }

  for (const file of walk(srcDir).filter((item) => item.endsWith('.js'))) {
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const text = readUtf8(file);
    if (/UPDATE\s+stock_balances\s+SET\s+quantity/i.test(text) && relative !== 'src/repositories/stockRepository.js') findings.push(finding('STOCK_LEDGER_BYPASS', relative, 'Alteração direta de stock_balances fora do stockRepository.'));
    if (/\b(?:UPDATE|DELETE\s+FROM)\s+stock_movements\b/i.test(text)) findings.push(finding('STOCK_MOVEMENT_MUTATION', relative, 'Ledger de stock_movements deve ser imutável.'));
  }

  const gitignore = path.join(root, '.gitignore');
  if (!fs.existsSync(gitignore) || !/^\.env$/m.test(readUtf8(gitignore))) findings.push(finding('ENV_NOT_IGNORED', '.gitignore', '.env precisa permanecer ignorado pelo Git.'));

  return findings;
}

module.exports = { runStaticSecurityChecks, walk };
