'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');const os=require('os');const path=require('path');
const {runStaticSecurityChecks}=require('../src/security/staticSecurityChecks');
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nm-sec-'));fs.mkdirSync(path.join(root,'src','config'),{recursive:true});fs.mkdirSync(path.join(root,'src','routes'),{recursive:true});fs.mkdirSync(path.join(root,'src','repositories'),{recursive:true});fs.mkdirSync(path.join(root,'public','js'),{recursive:true});fs.writeFileSync(path.join(root,'.gitignore'),'.env\n');fs.writeFileSync(path.join(root,'src','config','database.js'),"function getDatabaseConfig({ multipleStatements = false } = {}){}\n");fs.writeFileSync(path.join(root,'src','repositories','stockRepository.js'),"async function x(){ return 'UPDATE stock_balances SET quantity=? WHERE id=?'; }\n");fs.writeFileSync(path.join(root,'src','routes','productRoutes.js'),"const authenticate=1,gradeRoutes=2;router.use(authenticate);router.use('/:productId/grade', gradeRoutes);\n");fs.writeFileSync(path.join(root,'src','routes','gradeRoutes.js'),"const authorize=1;\n");fs.writeFileSync(path.join(root,'src','routes','publicCatalogRoutes.js'),"catalogRateLimit;catalogOrderCreateRateLimit;catalogOrderTrackRateLimit;\n");fs.writeFileSync(path.join(root,'src','routes','authRoutes.js'),"loginRateLimit;router.post('/logout', authenticate, x);\n");fs.writeFileSync(path.join(root,'src','routes','saleRoutes.js'),"const authenticate=1;router.use(authenticate);\n");return root;}

test('fixture segura passa sem achados',()=>{const root=fixture();assert.deepEqual(runStaticSecurityChecks(root),[]);fs.rmSync(root,{recursive:true,force:true});});

test('detecta eval e child_process',()=>{const root=fixture();fs.writeFileSync(path.join(root,'src','bad.js'),"eval('x'); require('child_process');");const codes=runStaticSecurityChecks(root).map(x=>x.code);assert.ok(codes.includes('DYNAMIC_CODE_EXECUTION'));assert.ok(codes.includes('CHILD_PROCESS_IN_APP'));fs.rmSync(root,{recursive:true,force:true});});

test('detecta bypass do ledger de estoque',()=>{const root=fixture();fs.writeFileSync(path.join(root,'src','badStock.js'),"db.execute('UPDATE stock_balances SET quantity=9');");assert.ok(runStaticSecurityChecks(root).some(x=>x.code==='STOCK_LEDGER_BYPASS'));fs.rmSync(root,{recursive:true,force:true});});

test('detecta rota administrativa sem authenticate',()=>{const root=fixture();fs.writeFileSync(path.join(root,'src','routes','financeRoutes.js'),"router.post('/x', controller.x);");assert.ok(runStaticSecurityChecks(root).some(x=>x.code==='ADMIN_ROUTE_WITHOUT_AUTH'));fs.rmSync(root,{recursive:true,force:true});});
