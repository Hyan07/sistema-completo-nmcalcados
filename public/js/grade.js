'use strict';

const feedback = document.getElementById('feedback');
const productSearchForm = document.getElementById('product-search-form');
const productSelect = document.getElementById('product-select');
const loadGradeButton = document.getElementById('load-grade');
const gradeSection = document.getElementById('grade-section');
const variantForm = document.getElementById('variant-form');
const variantsContainer = document.getElementById('variants-container');
const colorForm = document.getElementById('color-form');
const sizeForm = document.getElementById('size-form');
const colorsBody = document.getElementById('colors-body');
const sizesBody = document.getElementById('sizes-body');
const imageAssignment = document.getElementById('image-assignment');

let permissions = [];
let colors = [];
let sizes = [];
let currentGrade = null;
let currentProductId = null;

function can(code) { return permissions.includes(code); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function setFeedback(message, error = false) { feedback.textContent = message; feedback.classList.toggle('is-error', error); }
function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function selectedValues(select) { return [...select.selectedOptions].map((option) => option.value); }
function normalizeSkuPart(value) { return String(value ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''); }

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Operação não concluída.');
  return body;
}

function activeColorOptions(selected = '') {
  return colors.filter((color) => color.is_active || String(color.id) === String(selected)).map((color) => `<option value="${color.id}" ${String(color.id) === String(selected) ? 'selected' : ''}>${escapeHtml(color.name)}</option>`).join('');
}
function activeSizeOptions(selected = '') {
  return sizes.filter((size) => size.is_active || String(size.id) === String(selected)).map((size) => `<option value="${size.id}" ${String(size.id) === String(selected) ? 'selected' : ''}>${escapeHtml(size.label)}</option>`).join('');
}

function renderColors() {
  colorsBody.innerHTML = colors.map((color) => `<tr data-id="${color.id}"><td><div class="product-cell"><span class="color-swatch" style="background:${escapeHtml(color.hex_code || '#ffffff')}"></span><input class="table-input color-name" value="${escapeHtml(color.name)}" ${can('products.manage') ? '' : 'disabled'}></div></td><td><input class="table-input color-hex" value="${escapeHtml(color.hex_code || '')}" placeholder="#000000" ${can('products.manage') ? '' : 'disabled'}></td><td><select class="table-input color-active" ${can('products.manage') ? '' : 'disabled'}><option value="true" ${color.is_active ? 'selected' : ''}>Ativa</option><option value="false" ${color.is_active ? '' : 'selected'}>Inativa</option></select></td><td>${can('products.manage') ? '<button class="text-button save-color" type="button">Salvar</button>' : ''}</td></tr>`).join('');
  if (variantForm.colorId) variantForm.colorId.innerHTML = '<option value="">Selecione</option>' + activeColorOptions();
}

function renderSizes() {
  sizesBody.innerHTML = sizes.map((size) => `<tr data-id="${size.id}"><td><input class="table-input size-label" value="${escapeHtml(size.label)}" ${can('products.manage') ? '' : 'disabled'}></td><td><input class="table-input size-order" type="number" step="1" value="${size.sort_order}" ${can('products.manage') ? '' : 'disabled'}></td><td><select class="table-input size-active" ${can('products.manage') ? '' : 'disabled'}><option value="true" ${size.is_active ? 'selected' : ''}>Ativo</option><option value="false" ${size.is_active ? '' : 'selected'}>Inativo</option></select></td><td>${can('products.manage') ? '<button class="text-button save-size" type="button">Salvar</button>' : ''}</td></tr>`).join('');
}

async function loadTaxonomies() {
  const [colorResponse, sizeResponse] = await Promise.all([api('/api/colors'), api('/api/sizes')]);
  colors = colorResponse.data;
  sizes = sizeResponse.data;
  renderColors();
  renderSizes();
}

async function searchProducts() {
  const params = new URLSearchParams({ page: '1', pageSize: '50' });
  const q = productSearchForm.q.value.trim();
  if (q) params.set('q', q);
  const response = await api(`/api/products?${params}`);
  const previous = productSelect.value;
  productSelect.innerHTML = '<option value="">Selecione um produto</option>' + response.data.map((product) => `<option value="${product.id}">${escapeHtml(product.internal_code)} — ${escapeHtml(product.name)}</option>`).join('');
  if ([...productSelect.options].some((option) => option.value === previous)) productSelect.value = previous;
  if (!response.data.length) setFeedback('Nenhum produto encontrado para a busca.');
}

function skuValue(value) { return value === null || value === undefined ? '' : String(value); }

function renderVariants() {
  if (!currentGrade) return;
  const manage = can('products.manage');
  const product = currentGrade.product;
  if (!currentGrade.variants.length) {
    variantsContainer.innerHTML = '<div class="empty-grade">Este produto ainda não possui variantes de cor.</div>';
    return;
  }
  variantsContainer.innerHTML = currentGrade.variants.map((variant) => {
    const existingSizes = new Set((variant.skus || []).map((sku) => String(sku.size_id)));
    const availableSizes = sizes.filter((size) => size.is_active && !existingSizes.has(String(size.id)));
    const suggestedPrefix = normalizeSkuPart(`${product.internal_code}-${variant.color_name}`);
    const skuRows = (variant.skus || []).map((sku) => `<tr data-sku-id="${sku.id}">
      <td><select class="table-input sku-size" ${manage ? '' : 'disabled'}>${activeSizeOptions(sku.size_id)}</select></td>
      <td><input class="table-input sku-code" value="${escapeHtml(sku.sku)}" ${manage ? '' : 'disabled'}></td>
      <td><input class="table-input barcode" value="${escapeHtml(sku.barcode || '')}" ${manage ? '' : 'disabled'}></td>
      <td><input class="table-input sku-cost" type="number" min="0" step="0.01" value="${escapeHtml(skuValue(sku.cost_price))}" placeholder="Herdar" ${manage ? '' : 'disabled'}></td>
      <td><input class="table-input sku-sale" type="number" min="0" step="0.01" value="${escapeHtml(skuValue(sku.sale_price))}" placeholder="Herdar" ${manage ? '' : 'disabled'}></td>
      <td><input class="table-input sku-promo" type="number" min="0" step="0.01" value="${escapeHtml(skuValue(sku.promotional_price))}" placeholder="Herdar" ${manage ? '' : 'disabled'}></td>
      <td><input class="table-input sku-minimum" type="number" min="0" step="1" value="${sku.minimum_stock}" ${manage ? '' : 'disabled'}></td>
      <td><select class="table-input sku-active" ${manage ? '' : 'disabled'}><option value="true" ${sku.is_active ? 'selected' : ''}>Ativo</option><option value="false" ${sku.is_active ? '' : 'selected'}>Inativo</option></select></td>
      <td>${manage ? '<button class="text-button save-sku" type="button">Salvar</button>' : ''}</td>
    </tr>`).join('');
    return `<article class="variant-card" data-variant-id="${variant.id}">
      <h2 class="variant-title"><span class="color-swatch" style="background:${escapeHtml(variant.hex_code || '#ffffff')}"></span>${escapeHtml(variant.variant_name || variant.color_name)}</h2>
      <div class="variant-toolbar">
        <label>Cor<select class="variant-color" ${manage ? '' : 'disabled'}>${activeColorOptions(variant.color_id)}</select></label>
        <label>Nome opcional<input class="variant-name" maxlength="150" value="${escapeHtml(variant.variant_name || '')}" ${manage ? '' : 'disabled'}></label>
        <label>Status<select class="variant-active" ${manage ? '' : 'disabled'}><option value="true" ${variant.is_active ? 'selected' : ''}>Ativa</option><option value="false" ${variant.is_active ? '' : 'selected'}>Inativa</option></select></label>
        ${manage ? '<button class="secondary-button save-variant" type="button">Salvar variante</button>' : ''}
      </div>
      ${manage && variant.is_active ? `<form class="sku-batch-form">
        <label>Tamanhos<select class="batch-sizes" multiple required>${availableSizes.map((size) => `<option value="${size.id}">${escapeHtml(size.label)}</option>`).join('')}</select></label>
        <label>Prefixo do SKU<input class="batch-prefix" maxlength="90" value="${escapeHtml(suggestedPrefix)}" required></label>
        <label>Custo<input class="batch-cost" type="number" min="0" step="0.01" placeholder="Herdar ${money(product.base_cost_price)}"></label>
        <label>Venda<input class="batch-sale" type="number" min="0" step="0.01" placeholder="Herdar ${money(product.base_sale_price)}"></label>
        <label>Promoção<input class="batch-promo" type="number" min="0" step="0.01" placeholder="Herdar"></label>
        <label>Estoque mínimo<input class="batch-minimum" type="number" min="0" step="1" value="0"></label>
        <button class="primary-button" type="submit" ${availableSizes.length ? '' : 'disabled'}>Criar SKUs</button>
      </form>` : ''}
      <p class="inherit-hint">Campos de preço vazios no SKU herdam os valores-base do produto. O saldo de estoque será controlado na FASE 6.</p>
      <div class="table-wrap"><table class="sku-table"><thead><tr><th>Tamanho</th><th>SKU</th><th>Cód. barras</th><th>Custo</th><th>Venda</th><th>Promoção</th><th>Mínimo</th><th>Status</th><th></th></tr></thead><tbody>${skuRows || '<tr><td colspan="9" class="muted">Nenhum SKU cadastrado.</td></tr>'}</tbody></table></div>
    </article>`;
  }).join('');
}

function renderImages() {
  if (!currentGrade) return;
  const manage = can('products.manage');
  const variantOptions = currentGrade.variants.map((variant) => `<option value="${variant.id}">${escapeHtml(variant.variant_name || variant.color_name)}</option>`).join('');
  imageAssignment.innerHTML = currentGrade.images.length ? currentGrade.images.map((image) => `<article class="variant-image-card" data-image-id="${image.id}">
    <img src="${escapeHtml(image.file_path)}" alt="${escapeHtml(image.alt_text || '')}">
    <div class="image-controls"><select class="image-variant" ${manage ? '' : 'disabled'}><option value="">Sem cor específica</option>${variantOptions}</select>${manage ? '<button class="secondary-button save-image-variant" type="button">Salvar associação</button>' : ''}</div>
  </article>`).join('') : '<p class="muted">Nenhuma imagem cadastrada. Envie imagens na tela de Produtos e depois associe-as aqui.</p>';
  for (const image of currentGrade.images) {
    const card = imageAssignment.querySelector(`[data-image-id="${image.id}"]`);
    if (card) card.querySelector('.image-variant').value = image.product_variant_id ? String(image.product_variant_id) : '';
  }
}

async function loadGrade(productId) {
  const response = await api(`/api/products/${productId}/grade`);
  currentGrade = response.data;
  currentProductId = String(productId);
  gradeSection.hidden = false;
  document.getElementById('grade-product-name').textContent = currentGrade.product.name;
  document.getElementById('grade-product-meta').textContent = `${currentGrade.product.internal_code} · Venda base ${money(currentGrade.product.base_sale_price)}`;
  variantForm.hidden = !can('products.manage');
  variantForm.colorId.innerHTML = '<option value="">Selecione</option>' + activeColorOptions();
  renderVariants();
  renderImages();
  const url = new URL(window.location.href); url.searchParams.set('productId', currentProductId); history.replaceState(null, '', url);
  setFeedback('Grade carregada.');
}

async function refreshGrade() { if (currentProductId) await loadGrade(currentProductId); }

async function initialize() {
  try {
    const session = await api('/api/auth/me');
    permissions = session.permissions;
    if (!can('products.read')) throw new Error('Você não possui permissão para consultar a grade de produtos.');
    colorForm.hidden = !can('products.manage');
    sizeForm.hidden = !can('products.manage');
    await Promise.all([loadTaxonomies(), searchProducts()]);
    const requestedProduct = new URLSearchParams(window.location.search).get('productId');
    if (requestedProduct) {
      if (![...productSelect.options].some((option) => option.value === requestedProduct)) {
        const product = await api(`/api/products/${requestedProduct}`);
        const option = document.createElement('option'); option.value = product.data.id; option.textContent = `${product.data.internal_code} — ${product.data.name}`; productSelect.appendChild(option);
      }
      productSelect.value = requestedProduct;
      await loadGrade(requestedProduct);
    }
  } catch (error) { setFeedback(error.message, true); }
}

productSearchForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await searchProducts(); } catch (error) { setFeedback(error.message, true); } });
loadGradeButton.addEventListener('click', async () => { if (!productSelect.value) return setFeedback('Selecione um produto.', true); try { await loadGrade(productSelect.value); } catch (error) { setFeedback(error.message, true); } });
productSelect.addEventListener('change', () => { if (productSelect.value) loadGrade(productSelect.value).catch((error) => setFeedback(error.message, true)); });

colorForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/colors', { method: 'POST', body: JSON.stringify({ name: colorForm.name.value, hexCode: colorForm.hexCode.value || null }) }); colorForm.reset(); await loadTaxonomies(); await refreshGrade(); setFeedback('Cor cadastrada.'); } catch (error) { setFeedback(error.message, true); } });
sizeForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/sizes', { method: 'POST', body: JSON.stringify({ label: sizeForm.label.value, sortOrder: sizeForm.sortOrder.value }) }); sizeForm.reset(); sizeForm.sortOrder.value = '0'; await loadTaxonomies(); await refreshGrade(); setFeedback('Tamanho cadastrado.'); } catch (error) { setFeedback(error.message, true); } });

colorsBody.addEventListener('click', async (event) => { if (!event.target.classList.contains('save-color')) return; const row = event.target.closest('tr'); try { await api(`/api/colors/${row.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ name: row.querySelector('.color-name').value, hexCode: row.querySelector('.color-hex').value || null, isActive: row.querySelector('.color-active').value === 'true' }) }); await loadTaxonomies(); await refreshGrade(); setFeedback('Cor atualizada.'); } catch (error) { setFeedback(error.message, true); } });
sizesBody.addEventListener('click', async (event) => { if (!event.target.classList.contains('save-size')) return; const row = event.target.closest('tr'); try { await api(`/api/sizes/${row.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ label: row.querySelector('.size-label').value, sortOrder: row.querySelector('.size-order').value, isActive: row.querySelector('.size-active').value === 'true' }) }); await loadTaxonomies(); await refreshGrade(); setFeedback('Tamanho atualizado.'); } catch (error) { setFeedback(error.message, true); } });

variantForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!currentProductId) return; try { await api(`/api/products/${currentProductId}/grade/variants`, { method: 'POST', body: JSON.stringify({ colorId: variantForm.colorId.value, variantName: variantForm.variantName.value || null }) }); variantForm.reset(); await refreshGrade(); setFeedback('Variante de cor criada.'); } catch (error) { setFeedback(error.message, true); } });

variantsContainer.addEventListener('submit', async (event) => {
  if (!event.target.classList.contains('sku-batch-form')) return;
  event.preventDefault();
  const card = event.target.closest('[data-variant-id]');
  const sizeIds = selectedValues(event.target.querySelector('.batch-sizes'));
  if (!sizeIds.length) return setFeedback('Selecione ao menos um tamanho.', true);
  const prefix = normalizeSkuPart(event.target.querySelector('.batch-prefix').value);
  if (!prefix) return setFeedback('Informe um prefixo válido para o SKU.', true);
  const sizeMap = new Map(sizes.map((size) => [String(size.id), size]));
  const items = sizeIds.map((sizeId) => ({
    sizeId,
    sku: `${prefix}-${normalizeSkuPart(sizeMap.get(String(sizeId))?.label || sizeId)}`,
    costPrice: event.target.querySelector('.batch-cost').value || null,
    salePrice: event.target.querySelector('.batch-sale').value || null,
    promotionalPrice: event.target.querySelector('.batch-promo').value || null,
    minimumStock: event.target.querySelector('.batch-minimum').value || 0
  }));
  try { await api(`/api/products/${currentProductId}/grade/variants/${card.dataset.variantId}/skus`, { method: 'POST', body: JSON.stringify({ items }) }); await refreshGrade(); setFeedback(`${items.length} SKU(s) criado(s).`); } catch (error) { setFeedback(error.message, true); }
});

variantsContainer.addEventListener('click', async (event) => {
  const card = event.target.closest('[data-variant-id]');
  if (!card) return;
  try {
    if (event.target.classList.contains('save-variant')) {
      await api(`/api/products/${currentProductId}/grade/variants/${card.dataset.variantId}`, { method: 'PATCH', body: JSON.stringify({ colorId: card.querySelector('.variant-color').value, variantName: card.querySelector('.variant-name').value || null, isActive: card.querySelector('.variant-active').value === 'true' }) });
      await refreshGrade(); setFeedback('Variante atualizada.');
    }
    if (event.target.classList.contains('save-sku')) {
      const row = event.target.closest('[data-sku-id]');
      await api(`/api/products/${currentProductId}/grade/variants/${card.dataset.variantId}/skus/${row.dataset.skuId}`, { method: 'PATCH', body: JSON.stringify({
        sizeId: row.querySelector('.sku-size').value,
        sku: row.querySelector('.sku-code').value,
        barcode: row.querySelector('.barcode').value || null,
        costPrice: row.querySelector('.sku-cost').value || null,
        salePrice: row.querySelector('.sku-sale').value || null,
        promotionalPrice: row.querySelector('.sku-promo').value || null,
        minimumStock: row.querySelector('.sku-minimum').value,
        isActive: row.querySelector('.sku-active').value === 'true'
      }) });
      await refreshGrade(); setFeedback('SKU atualizado.');
    }
  } catch (error) { setFeedback(error.message, true); }
});

imageAssignment.addEventListener('click', async (event) => {
  if (!event.target.classList.contains('save-image-variant')) return;
  const card = event.target.closest('[data-image-id]');
  try { await api(`/api/products/${currentProductId}/grade/images/${card.dataset.imageId}/variant`, { method: 'PATCH', body: JSON.stringify({ variantId: card.querySelector('.image-variant').value || null }) }); await refreshGrade(); setFeedback('Foto associada à cor.'); } catch (error) { setFeedback(error.message, true); }
});

initialize();
