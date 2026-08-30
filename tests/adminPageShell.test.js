'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN_HTML_FILES, SHELL_VERSION, injectAdminAssets } = require('../src/middlewares/adminPageShell');

test('shell administrativo cobre todos os módulos internos principais', () => {
  for (const file of ['dashboard.html','pos.html','cash.html','finance.html','products.html','grade.html','stock.html','customers.html','suppliers.html','purchases.html','catalog-orders.html','reports.html','imports.html','users.html']) {
    assert.equal(ADMIN_HTML_FILES.has(file), true, file);
  }
});

test('injeta design system, componentes e scripts compartilhados uma única vez', () => {
  const original = '<!doctype html><html><head><link rel="stylesheet" href="/css/bankdash-theme.css"></head><body><main></main><script src="/js/ui-polish.js"></script></body></html>';
  const first = injectAdminAssets(original);
  const second = injectAdminAssets(first);

  assert.match(first, new RegExp(`/css/design-system\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/css/admin-shell\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/css/erp-components\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/js/admin-shell\\.js\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/js/ui-core\\.js\\?v=${SHELL_VERSION}`));

  assert.doesNotMatch(first, /bankdash-theme\.css/);
  assert.doesNotMatch(first, /ux-navigation\.css/);
  assert.doesNotMatch(first, /ui-polish\.js/);
  assert.doesNotMatch(first, /ux-navigation\.js/);

  assert.equal((second.match(/data-nm-design-system/g) || []).length, 1);
  assert.equal((second.match(/data-nm-admin-shell-style/g) || []).length, 1);
  assert.equal((second.match(/data-nm-erp-components/g) || []).length, 1);
  assert.equal((second.match(/data-nm-admin-shell-script/g) || []).length, 1);
  assert.equal((second.match(/data-nm-ui-core/g) || []).length, 1);
});
