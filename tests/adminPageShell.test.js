'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN_HTML_FILES, SHELL_VERSION, injectAdminAssets } = require('../src/middlewares/adminPageShell');

test('shell administrativo cobre todos os módulos internos principais', () => {
  for (const file of ['dashboard.html','pos.html','cash.html','finance.html','products.html','grade.html','stock.html','customers.html','suppliers.html','purchases.html','catalog-orders.html','reports.html','imports.html','users.html']) {
    assert.equal(ADMIN_HTML_FILES.has(file), true, file);
  }
});

test('injeta tema e camada de usabilidade uma única vez', () => {
  const original = '<!doctype html><html><head></head><body><main></main></body></html>';
  const first = injectAdminAssets(original);
  const second = injectAdminAssets(first);

  assert.match(first, new RegExp(`/css/admin-shell\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/css/bankdash-theme\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/css/ux-navigation\\.css\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/js/admin-shell\\.js\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/js/ui-polish\\.js\\?v=${SHELL_VERSION}`));
  assert.match(first, new RegExp(`/js/ux-navigation\\.js\\?v=${SHELL_VERSION}`));
  assert.equal((second.match(/data-nm-admin-shell/g) || []).length, 2);
  assert.equal((second.match(/data-nm-bankdash-shell/g) || []).length, 2);
  assert.equal((second.match(/data-nm-ux-shell/g) || []).length, 2);
});
