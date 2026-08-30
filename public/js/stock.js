'use strict';

const stockBody = document.getElementById('stock-body');
const stockFilters = document.getElementById('stock-filters');
const stockFeedback = document.getElementById('stock-feedback');
const movementCard = document.getElementById('movement-card');
const movementForm = document.getElementById('movement-form');
const countForm = document.getElementById('count-form');
const movementFeedback = document.getElementById('movement-feedback');
const historyBody = document.getElementById('history-body');
const historyFilters = document.getElementById('history-filters');
let permissions = [];
let stockItems = [];
let selectedSkuId = null;
let historySkuId = null;
let stockPage = 1;
let stockTotalPages = 1;
let historyPage = 1;
let historyTotalPages = 1;

function can(code) { return permissions.includes(code); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function feedback(target, message, error = false) { target.textContent = message; target.classList.toggle('is-error', error); }
function operationKey(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = globalThis.crypto?.getRandomValues ? [...globalThis.crypto.getRandomValues(new Uint32Array(4))].map((v) => v.toString(16)).join('') : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random}`.slice(0, 64);
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Operação não concluída.');
  return data;
}
function statusLabel(status) {
  const labels = { OUT_OF_STOCK: 'Sem estoque', LOW_STOCK: 'Estoque baixo', OK: 'Normal', INACTIVE: 'Inativo', INACTIVE_WITH_STOCK: 'Inativo com saldo' };
  const classes = { OUT_OF_STOCK: 'out', LOW_STOCK: 'low', OK: 'ok', INACTIVE: 'inactive', INACTIVE_WITH_STOCK: 'inactive' };
  return `<span class="stock-badge ${classes[status] || ''}">${labels[status] || escapeHtml(status)}</span>`;
}
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleString('pt-BR');
}
async function loadSummary() {
  const response = await api('/api/stock/summary');
  document.getElementById('summary-units').textContent = response.data.totalUnits;
  document.getElementById('summary-skus').textContent = response.data.totalSkus;
  document.getElementById('summary-out').textContent = response.data.outOfStock;
  document.getElementById('summary-low').textContent = response.data.lowStock;
  document.getElementById('summary-inactive').textContent = response.data.inactiveWithStock;
}
async function loadMovementTypes() {
  const response = await api('/api/stock/movement-types');
  historyFilters.typeCode.innerHTML = '<option value="">Todos os tipos</option>' + response.data.map((item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`).join('');
}
async function loadStock(page = stockPage) {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (stockFilters.q.value.trim()) params.set('q', stockFilters.q.value.trim());
  if (stockFilters.status.value) params.set('status', stockFilters.status.value);
  const response = await api(`/api/stock/items?${params}`);
  stockItems = response.data;
  stockPage = response.pagination.page;
  stockTotalPages = response.pagination.totalPages;
  document.getElementById('stock-count').textContent = `${response.pagination.total} SKU(s)`;
  document.getElementById('stock-page').textContent = `Página ${stockPage} de ${stockTotalPages}`;
  document.getElementById('stock-prev').disabled = stockPage <= 1;
  document.getElementById('stock-next').disabled = stockPage >= stockTotalPages;
  stockBody.innerHTML = stockItems.map((item) => `<tr data-sku-id="${item.sku_id}">
    <td class="product-stock-cell"><strong>${escapeHtml(item.product_name)}</strong><small>${escapeHtml(item.internal_code)}</small></td>
    <td>${escapeHtml(item.color_name)}</td><td>${escapeHtml(item.size_label)}</td>
    <td><strong>${escapeHtml(item.sku)}</strong>${item.barcode ? `<small>${escapeHtml(item.barcode)}</small>` : ''}</td>
    <td>${item.minimum_stock}</td><td class="stock-quantity">${item.quantity}</td><td>${statusLabel(item.stock_status)}</td>
    <td class="actions">${can('stock.manage') ? '<button class="text-button select-stock" type="button">Movimentar</button>' : ''}<button class="text-button filter-history" type="button">Histórico</button></td>
  </tr>`).join('');
}
function selectStockItem(skuId) {
  const item = stockItems.find((row) => String(row.sku_id) === String(skuId));
  selectedSkuId = String(skuId);
  document.getElementById('selected-sku').textContent = item ? `${item.product_name} · ${item.color_name} · ${item.size_label} · ${item.sku} · saldo ${item.quantity}` : `SKU #${skuId}`;
  movementCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function loadHistory(page = historyPage) {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (historySkuId) params.set('skuId', historySkuId);
  if (historyFilters.q.value.trim()) params.set('q', historyFilters.q.value.trim());
  if (historyFilters.typeCode.value) params.set('typeCode', historyFilters.typeCode.value);
  if (historyFilters.dateFrom.value) params.set('dateFrom', historyFilters.dateFrom.value);
  if (historyFilters.dateTo.value) params.set('dateTo', historyFilters.dateTo.value);
  const response = await api(`/api/stock/movements?${params}`);
  historyPage = response.pagination.page;
  historyTotalPages = response.pagination.totalPages;
  document.getElementById('history-count').textContent = `${response.pagination.total} movimentação(ões)${historySkuId ? ' no SKU selecionado' : ''}`;
  document.getElementById('history-page').textContent = `Página ${historyPage} de ${historyTotalPages}`;
  document.getElementById('history-prev').disabled = historyPage <= 1;
  document.getElementById('history-next').disabled = historyPage >= historyTotalPages;
  document.getElementById('clear-history-sku').hidden = !historySkuId;
  historyBody.innerHTML = response.data.map((item) => `<tr>
    <td>${formatDate(item.happened_at)}</td>
    <td><strong>${escapeHtml(item.product_name)}</strong><small>${escapeHtml(item.color_name)} · ${escapeHtml(item.size_label)} · ${escapeHtml(item.sku)}</small></td>
    <td>${escapeHtml(item.type_name)}</td><td>${item.previous_quantity}</td>
    <td class="${Number(item.quantity_change) > 0 ? 'delta-positive' : 'delta-negative'}">${Number(item.quantity_change) > 0 ? '+' : ''}${item.quantity_change}</td>
    <td><strong>${item.new_quantity}</strong></td><td>${escapeHtml(item.user_name)}</td><td>${escapeHtml(item.reason || '—')}</td>
  </tr>`).join('');
}
async function refreshAll() { await Promise.all([loadSummary(), loadStock(), loadHistory()]); }
async function initialize() {
  try {
    const session = await api('/api/auth/me');
    permissions = session.permissions;
    if (!can('stock.read')) throw new Error('Você não possui permissão para consultar estoque.');
    movementCard.hidden = !can('stock.manage');
    await loadMovementTypes();
    await Promise.all([loadSummary(), loadStock(1), loadHistory(1)]);
    feedback(stockFeedback, 'Estoque atualizado.');
  } catch (error) { feedback(stockFeedback, error.message, true); }
}
stockFilters.addEventListener('submit', (event) => { event.preventDefault(); loadStock(1).catch((error) => feedback(stockFeedback, error.message, true)); });
document.getElementById('refresh-stock').addEventListener('click', () => refreshAll().catch((error) => feedback(stockFeedback, error.message, true)));
document.getElementById('stock-prev').addEventListener('click', () => loadStock(stockPage - 1).catch((error) => feedback(stockFeedback, error.message, true)));
document.getElementById('stock-next').addEventListener('click', () => loadStock(stockPage + 1).catch((error) => feedback(stockFeedback, error.message, true)));
stockBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-sku-id]'); if (!row) return;
  if (event.target.classList.contains('select-stock')) selectStockItem(row.dataset.skuId);
  if (event.target.classList.contains('filter-history')) { historySkuId = row.dataset.skuId; loadHistory(1).then(() => document.querySelector('.history-table').scrollIntoView({ behavior: 'smooth' })).catch((error) => feedback(stockFeedback, error.message, true)); }
});
movementForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!selectedSkuId) return feedback(movementFeedback, 'Selecione um SKU.', true);
  const button = movementForm.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const response = await api(`/api/stock/items/${selectedSkuId}/movements`, { method: 'POST', body: JSON.stringify({ typeCode: movementForm.typeCode.value, quantity: Number(movementForm.quantity.value), reason: movementForm.reason.value, operationKey: operationKey('manual') }) });
    movementForm.reset(); feedback(movementFeedback, response.data.duplicate ? 'Operação já havia sido registrada; nenhum lançamento duplicado foi criado.' : 'Movimentação registrada com sucesso.'); await refreshAll(); selectStockItem(selectedSkuId);
  } catch (error) { feedback(movementFeedback, error.message, true); } finally { button.disabled = false; }
});
countForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!selectedSkuId) return feedback(movementFeedback, 'Selecione um SKU.', true);
  const button = countForm.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const response = await api(`/api/stock/items/${selectedSkuId}/count`, { method: 'POST', body: JSON.stringify({ countedQuantity: Number(countForm.countedQuantity.value), reason: countForm.reason.value, operationKey: operationKey('count') }) });
    countForm.reset(); feedback(movementFeedback, response.data.changed ? 'Contagem aplicada e movimentação de ajuste registrada.' : 'Contagem conferida: o saldo já estava correto.'); await refreshAll(); selectStockItem(selectedSkuId);
  } catch (error) { feedback(movementFeedback, error.message, true); } finally { button.disabled = false; }
});
historyFilters.addEventListener('submit', (event) => { event.preventDefault(); loadHistory(1).catch((error) => feedback(stockFeedback, error.message, true)); });
document.getElementById('refresh-history').addEventListener('click', () => loadHistory().catch((error) => feedback(stockFeedback, error.message, true)));
document.getElementById('history-prev').addEventListener('click', () => loadHistory(historyPage - 1).catch((error) => feedback(stockFeedback, error.message, true)));
document.getElementById('history-next').addEventListener('click', () => loadHistory(historyPage + 1).catch((error) => feedback(stockFeedback, error.message, true)));
document.getElementById('clear-history-sku').addEventListener('click', () => { historySkuId = null; loadHistory(1).catch((error) => feedback(stockFeedback, error.message, true)); });
initialize();
