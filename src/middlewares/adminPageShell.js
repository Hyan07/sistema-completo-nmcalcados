'use strict';

const fs = require('fs/promises');
const path = require('path');

const ADMIN_HTML_FILES = new Set([
  'cash.html',
  'catalog-orders.html',
  'customers.html',
  'dashboard.html',
  'finance.html',
  'grade.html',
  'imports.html',
  'pos.html',
  'products.html',
  'purchases.html',
  'reports.html',
  'stock.html',
  'suppliers.html',
  'users.html'
]);

const SHELL_VERSION = '20260830-3';
const STYLE_TAG = `<link rel="stylesheet" href="/css/admin-shell.css?v=${SHELL_VERSION}" data-nm-admin-shell>`;
const SCRIPT_TAG = `<script src="/js/admin-shell.js?v=${SHELL_VERSION}" defer data-nm-admin-shell></script>`;

function injectAdminAssets(html) {
  let result = String(html || '');
  if (!result.includes('data-nm-admin-shell')) {
    result = result.replace('</head>', `  ${STYLE_TAG}\n</head>`);
    result = result.replace('</body>', `  ${SCRIPT_TAG}\n</body>`);
  }
  return result;
}

function createAdminPageShellMiddleware(publicDir) {
  const pagesDir = path.resolve(publicDir, 'pages');

  return async function adminPageShellMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();

    const requested = String(req.path || '').replace(/^\/+/, '');
    if (!ADMIN_HTML_FILES.has(requested)) return next();

    try {
      const filePath = path.join(pagesDir, requested);
      const html = await fs.readFile(filePath, 'utf8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('html').send(injectAdminAssets(html));
    } catch (error) {
      if (error?.code === 'ENOENT') return next();
      return next(error);
    }
  };
}

module.exports = { ADMIN_HTML_FILES, SHELL_VERSION, createAdminPageShellMiddleware, injectAdminAssets };
