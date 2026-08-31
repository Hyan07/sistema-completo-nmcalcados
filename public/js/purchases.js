'use strict';

const feedback = document.getElementById('feedback');
const detailFeedback = document.getElementById('detail-feedback');
const form = document.getElementById('purchase-form');
const createCard = document.getElementById('create-card');
const filters = document.getElementById('filters');
const body = document.getElementById('purchases-body');
const dialog = document.getElementById('purchase-dialog');
const newItemsBody = document.getElementById('new-items-body');
const supplierSearch = document.getElementById('supplier-search');
const supplierResults = document.getElementById('supplier-results');
const skuSearch = document.getElementById('sku-search');
const skuResults = document.getElementById('sku-results');

let permissions = [];
let page = 1;
let totalPages = 1;
let localItems = [];
let currentPurchase = null;

function can(code) { return permissions.includes(code); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function setFeedback(message, error = false, target = feedback) { target.textContent = message; target.classList.toggle('is-error', error); }
function opKey() { return `receipt-${Date.now()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`.slice(0, 64); }
function statusLabel(status) {
  return ({ DRAFT: 'Rascunho', ORDERED: 'Aguardando entrada', PARTIALLY_RECEIVED: 'Recebida parcialmente', RECEIVED: 'Confirmada', CANCELLED: 'Cancelada' })[status] || status;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Operação não concluída.');
  return data;
}

function renderLocalItems() {
  newItemsBody.innerHTML = localItems.map((item, index) => `
    <tr>
      <td>${esc(item.sku)}</td>
      <td>${esc(item.description)}</td>
      <td>${item.quantityOrdered}</td>
      <td>${money(item.unitCost)}</td>
      <td>${money(item.discountAmount)}</td>
      <td><button class="text-button remove-local" data-index="${index}" type="button">Remover</button></td>
    </tr>
  `).join('');
}

async function searchSuppliers() {
  const q = supplierSearch.value.trim();
  if (q.length < 2) return;
  supplierResults.innerHTML = '<option value="">Buscando...</option>';
  const response = await api(`/api/suppliers/lookup?q=${encodeURIComponent(q)}`);
  supplierResults.innerHTML = '<option value="">Selecione</option>' + response.data.map((supplier) => `
    <option value="${supplier.id}">${esc(supplier.trade_name || supplier.legal_name)} ${supplier.document_masked ? `· ${esc(supplier.document_masked)}` : ''}</option>
  `).join('');
}

async function searchSkus() {
  const q = skuSearch.value.trim();
  if (q.length < 2) return;
  skuResults.innerHTML = '<option value="">Buscando...</option>';
  const response = await api(`/api/purchases/meta/skus?q=${encodeURIComponent(q)}`);
  skuResults.innerHTML = '<option value="">Selecione</option>' + response.data.map((sku) => `
    <option value="${sku.id}"
      data-sku="${esc(sku.sku)}"
      data-name="${esc(`${sku.product_name} · ${sku.color_name} · ${sku.size_label}`)}"
      data-cost="${sku.effective_cost_price || 0}">
      ${esc(sku.product_name)} · ${esc(sku.color_name)} · ${esc(sku.size_label)}
    </option>
  `).join('');
}

async function load(target = page) {
  const params = new URLSearchParams({ page: String(target), pageSize: '20' });
  for (const name of ['q', 'status', 'dateFrom', 'dateTo']) if (filters[name].value) params.set(name, filters[name].value);
  const response = await api(`/api/purchases?${params}`);
  page = response.pagination.page;
  totalPages = response.pagination.totalPages;
  document.getElementById('purchase-count').textContent = `${response.pagination.total} compra(s)`;
  document.getElementById('page-info').textContent = `Página ${page} de ${totalPages}`;
  document.getElementById('prev').disabled = page <= 1;
  document.getElementById('next').disabled = page >= totalPages;
  body.innerHTML = response.data.map((purchase) => `
    <tr>
      <td><strong>#${purchase.id}</strong>${purchase.document_number ? `<small class="muted">${esc(purchase.document_number)}</small>` : ''}</td>
      <td>${esc(purchase.supplier_trade_name || purchase.supplier_legal_name)}</td>
      <td>${esc(purchase.purchase_date)}</td>
      <td>${Number(purchase.total_received_units)}/${Number(purchase.total_ordered_units)}</td>
      <td>${money(purchase.total_amount)}</td>
      <td><span class="status-chip">${esc(statusLabel(purchase.status))}</span></td>
      <td><button class="text-button open" data-id="${purchase.id}" type="button">Abrir</button></td>
    </tr>
  `).join('');
}

function renderDetail(data) {
  currentPurchase = data;
  const purchase = data.purchase;
  document.getElementById('detail-title').textContent = `Compra #${purchase.id}`;
  document.getElementById('detail-meta').textContent = `${purchase.supplier_trade_name || purchase.supplier_legal_name} · ${statusLabel(purchase.status)}`;
  document.getElementById('detail-values').innerHTML = `
    <p>Subtotal: <strong>${money(purchase.subtotal)}</strong></p>
    <p>Desconto: ${money(purchase.discount_amount)}</p>
    <p>Frete: ${money(purchase.freight_amount)}</p>
    <p>Outras despesas: ${money(purchase.other_expenses_amount)}</p>
    <p>Total: <strong>${money(purchase.total_amount)}</strong></p>
  `;
  document.getElementById('detail-delivery').innerHTML = `
    <p>Compra: ${esc(purchase.purchase_date)}</p>
    <p>Previsão: ${esc(purchase.expected_date || '—')}</p>
    <p>Conclusão: ${esc(purchase.received_at || '—')}</p>
    <p>Documento: ${esc(purchase.document_number || '—')}</p>
  `;
  document.getElementById('detail-items').innerHTML = data.items.map((item) => `
    <tr>
      <td>${esc(item.sku_snapshot)}</td>
      <td>${esc(item.description_snapshot)}</td>
      <td>${item.quantity_ordered}</td>
      <td>${item.quantity_received}</td>
      <td>${item.quantity_pending}</td>
      <td>${money(item.unit_cost)}</td>
      <td>${item.is_active ? 'Ativo' : 'Cancelado'}</td>
    </tr>
  `).join('');

  const actions = document.getElementById('detail-actions');
  actions.innerHTML = '';

  if (can('purchases.confirm') && ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(purchase.status)) {
    actions.innerHTML += '<button class="primary-button confirm-purchase" type="button">Confirmar compra e dar entrada no estoque</button>';
  }
  if (can('purchases.manage') && purchase.status === 'DRAFT') {
    actions.innerHTML += '<button class="secondary-button order-purchase" type="button">Aguardar entrega</button>';
  }
  if (can('purchases.manage') && ['DRAFT', 'ORDERED'].includes(purchase.status)) {
    actions.innerHTML += '<button class="text-button cancel-purchase" type="button">Cancelar compra</button>';
  }

  const receiptForm = document.getElementById('receipt-form');
  const receivable = ['ORDERED', 'PARTIALLY_RECEIVED'].includes(purchase.status) && can('purchases.receive');
  receiptForm.hidden = !receivable;
  document.getElementById('receipt-items').innerHTML = receivable
    ? data.items.filter((item) => item.is_active && Number(item.quantity_pending) > 0).map((item) => `
      <label class="receipt-line">
        <span><strong>${esc(item.description_snapshot)}</strong><small class="muted">Pendente: ${item.quantity_pending}</small></span>
        <input type="number" min="0" max="${item.quantity_pending}" value="0" data-item-id="${item.id}">
        <span>un.</span>
      </label>
    `).join('')
    : '';

  document.getElementById('receipt-history').innerHTML = data.receipts.length
    ? data.receipts.map((receipt) => `
      <div class="receipt-card">
        <strong>Entrada #${receipt.id}</strong> · ${esc(receipt.received_at)} · ${esc(receipt.received_by_name)}
        <div>${receipt.items.map((item) => `${esc(item.description_snapshot)}: +${item.quantity_received}`).join(' · ')}</div>
      </div>
    `).join('')
    : '<p class="muted">Nenhuma entrada confirmada.</p>';
}

async function openPurchase(id) {
  const response = await api(`/api/purchases/${id}`);
  renderDetail(response.data);
  if (!dialog.open) dialog.showModal();
}

async function refreshDetail() {
  if (currentPurchase) await openPurchase(currentPurchase.purchase.id);
}

function purchasePayload() {
  return {
    supplierId: Number(form.supplierId.value),
    documentNumber: form.documentNumber.value || null,
    purchaseDate: form.purchaseDate.value,
    expectedDate: form.expectedDate.value || null,
    discountAmount: form.discountAmount.value || '0',
    freightAmount: form.freightAmount.value || '0',
    otherExpensesAmount: form.otherExpensesAmount.value || '0',
    notes: form.notes.value || null,
    items: localItems.map(({ sku, description, ...item }) => item)
  };
}

async function init() {
  try {
    const session = await api('/api/auth/me');
    permissions = session.permissions;
    if (!can('purchases.read')) throw new Error('Você não possui permissão para consultar compras.');
    createCard.hidden = !can('purchases.manage');
    form.purchaseDate.value = new Date().toISOString().slice(0, 10);
    await load(1);
    setFeedback('Compras atualizadas.');
  } catch (error) {
    setFeedback(error.message, true);
  }
}

let supplierTimer;
supplierSearch.addEventListener('input', () => {
  clearTimeout(supplierTimer);
  supplierTimer = setTimeout(() => searchSuppliers().catch((error) => setFeedback(error.message, true)), 250);
});

let skuTimer;
skuSearch.addEventListener('input', () => {
  clearTimeout(skuTimer);
  skuTimer = setTimeout(() => searchSkus().catch((error) => setFeedback(error.message, true)), 250);
});

skuResults.addEventListener('change', () => {
  const option = skuResults.selectedOptions[0];
  if (option?.dataset.cost) document.getElementById('item-cost').value = option.dataset.cost;
});

document.getElementById('add-local-item').addEventListener('click', () => {
  const option = skuResults.selectedOptions[0];
  if (!option || !option.value) return setFeedback('Selecione um produto, cor e tamanho.', true);
  if (localItems.some((item) => String(item.skuId) === option.value)) return setFeedback('Esta combinação já foi adicionada.', true);

  const quantity = Number(document.getElementById('item-qty').value);
  const cost = document.getElementById('item-cost').value;
  const discount = document.getElementById('item-discount').value || '0';
  if (!Number.isInteger(quantity) || quantity < 1 || cost === '') return setFeedback('Informe quantidade e custo.', true);

  localItems.push({
    skuId: Number(option.value),
    sku: option.dataset.sku,
    description: option.dataset.name,
    quantityOrdered: quantity,
    unitCost: cost,
    discountAmount: discount
  });
  renderLocalItems();
});

newItemsBody.addEventListener('click', (event) => {
  if (!event.target.classList.contains('remove-local')) return;
  localItems.splice(Number(event.target.dataset.index), 1);
  renderLocalItems();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!localItems.length) return setFeedback('Adicione ao menos um produto à compra.', true);

  try {
    const response = await api('/api/purchases', { method: 'POST', body: JSON.stringify(purchasePayload()) });
    const purchaseId = response.id;
    localItems = [];
    renderLocalItems();
    form.reset();
    form.purchaseDate.value = new Date().toISOString().slice(0, 10);
    supplierResults.innerHTML = '<option value="">Busque e selecione um fornecedor</option>';
    await load(1);
    await openPurchase(purchaseId);
    setFeedback(`Compra #${purchaseId} criada. Revise os itens e confirme para lançar no estoque.`);
  } catch (error) {
    setFeedback(error.message, true);
  }
});

body.addEventListener('click', (event) => {
  if (event.target.classList.contains('open')) openPurchase(event.target.dataset.id).catch((error) => setFeedback(error.message, true));
});

document.getElementById('detail-actions').addEventListener('click', async (event) => {
  if (!currentPurchase) return;
  const purchaseId = currentPurchase.purchase.id;

  try {
    if (event.target.classList.contains('confirm-purchase')) {
      const confirmed = window.confirm('Confirmar esta compra? Todos os itens pendentes serão lançados no estoque.');
      if (!confirmed) return;
      event.target.disabled = true;
      const response = await api(`/api/purchases/${purchaseId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ operationKey: opKey() })
      });
      setFeedback(`Compra confirmada. ${response.data.totalUnits || 0} unidade(s) entraram no estoque.`, false, detailFeedback);
    } else if (event.target.classList.contains('order-purchase')) {
      await api(`/api/purchases/${purchaseId}/order`, { method: 'POST', body: '{}' });
      setFeedback('Compra marcada como aguardando entrega.', false, detailFeedback);
    } else if (event.target.classList.contains('cancel-purchase')) {
      const reason = prompt('Motivo do cancelamento:');
      if (!reason) return;
      await api(`/api/purchases/${purchaseId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      setFeedback('Compra cancelada.', false, detailFeedback);
    } else {
      return;
    }

    await refreshDetail();
    await load();
  } catch (error) {
    event.target.disabled = false;
    setFeedback(error.message, true, detailFeedback);
  }
});

document.getElementById('receipt-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentPurchase) return;

  const items = [...document.querySelectorAll('#receipt-items input[data-item-id]')]
    .map((input) => ({ purchaseItemId: Number(input.dataset.itemId), quantity: Number(input.value) }))
    .filter((item) => item.quantity > 0);

  if (!items.length) return setFeedback('Informe ao menos uma quantidade recebida.', true, detailFeedback);

  try {
    await api(`/api/purchases/${currentPurchase.purchase.id}/receipts`, {
      method: 'POST',
      body: JSON.stringify({ operationKey: opKey(), notes: event.currentTarget.notes.value || null, items })
    });
    event.currentTarget.reset();
    await refreshDetail();
    await load();
    setFeedback('Entrada parcial confirmada e estoque atualizado.', false, detailFeedback);
  } catch (error) {
    setFeedback(error.message, true, detailFeedback);
  }
});

filters.addEventListener('submit', (event) => { event.preventDefault(); load(1).catch((error) => setFeedback(error.message, true)); });
document.getElementById('refresh').addEventListener('click', () => load().catch((error) => setFeedback(error.message, true)));
document.getElementById('prev').addEventListener('click', () => load(page - 1).catch((error) => setFeedback(error.message, true)));
document.getElementById('next').addEventListener('click', () => load(page + 1).catch((error) => setFeedback(error.message, true)));
document.getElementById('close-detail').addEventListener('click', () => { dialog.close(); currentPurchase = null; });

init();
