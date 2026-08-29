'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const roots = ['server.js', 'src', 'scripts', 'tests'];
const files = [];
function collect(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) { if (target.endsWith('.js')) files.push(target); return; }
  for (const name of fs.readdirSync(target)) collect(path.join(target, name));
}
for (const root of roots) collect(path.resolve(process.cwd(), root));
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Sintaxe validada em ${files.length} arquivo(s) JavaScript.`);
