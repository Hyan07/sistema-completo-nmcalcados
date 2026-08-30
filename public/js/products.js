'use strict';

const feedback = document.getElementById('feedback');
const imageFeedback = document.getElementById('image-feedback');
const categoryForm = document.getElementById('category-form');
const brandForm = document.getElementById('brand-form');
const productForm = document.getElementById('product-form');
const productCreateCard = document.getElementById('product-create-card');
const toggleProductCreate = document.getElementById('toggle-product-create');
const closeProductCreate = document.getElementById('close-product-create');
const categoriesBody = document.getElementById('categories-body');
const brandsBody = document.getElementById('brands-body');
const productsBody = document.getElementById('products-body');
const filtersForm = document.getElementById('product-filters');
const productDialog = document.getElementById('product-dialog');
const productEditForm = document.getElementById('product-edit-form');
const imagesDialog = document.getElementById('images-dialog');
const imageUploadForm = document.getElementById('image-upload-form');
const imageGallery = document.getElementById('image-gallery');

let permissions = [];
let categories = [];
let brands = [];
let currentPage = 1;
let totalPages = 1;
let currentImageProductId = null;

function can(code) { return permissions.includes(code); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function setFeedback(message, error = false, target = feedback) { target.textContent = message; target.classList.toggle('is-error', error); }
function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function selectedValue(value) { return value === null || value === undefined ? '' : String(value); }
function setCreatePanel(open) {
  if (!can('products.manage')) return;
  productCreateCard.hidden = !open;
  toggleProductCreate?.setAttribute('aria-expanded', String(open));
  if (open) {
    productCreateCard.scrollIntoView({ behavior:'smooth', block:'start' });
    window.setTimeout(() => productForm.internalCode?.focus(), 220);
  }
}

async function api(url, options = {}) {
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  const response = await fetch(url, { credentials:'same-origin', ...options, headers:{ ...headers, ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Operação não concluída.');
  return data;
}

function categoryOptions(selected = '', includeBlank = true) {
  const options = categories.filter((item) => item.is_active || String(item.id) === String(selected)).map((item) => `<option value="${item.id}" ${String(item.id) === String(selected) ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
  return `${includeBlank ? '<option value="">Sem categoria</option>' : ''}${options}`;
}
function brandOptions(selected = '', includeBlank = true) {
  const options = brands.filter((item) => item.is_active || String(item.id) === String(selected)).map((item) => `<option value="${item.id}" ${String(item.id) === String(selected) ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
  return `${includeBlank ? '<option value="">Sem marca</option>' : ''}${options}`;
}
function refreshSelects() {
  categoryForm.parentId.innerHTML = categoryOptions('', true).replace('Sem categoria', 'Sem categoria pai');
  productForm.categoryId.innerHTML = categoryOptions();
  productForm.brandId.innerHTML = brandOptions();
  filtersForm.categoryId.innerHTML = '<option value="">Todas as categorias</option>' + categoryOptions('', false);
  filtersForm.brandId.innerHTML = '<option value="">Todas as marcas</option>' + brandOptions('', false);
}

function renderCategories() {
  categoriesBody.innerHTML = categories.map((item) => `<tr data-id="${item.id}"><td><input class="table-input category-name" value="${escapeHtml(item.name)}" ${can('products.manage') ? '' : 'disabled'}></td><td><select class="table-input category-parent" ${can('products.manage') ? '' : 'disabled'}><option value="">Sem pai</option>${categories.filter((candidate) => String(candidate.id) !== String(item.id)).map((candidate) => `<option value="${candidate.id}" ${String(candidate.id) === String(item.parent_id) ? 'selected' : ''}>${escapeHtml(candidate.name)}</option>`).join('')}</select></td><td><select class="table-input category-active" ${can('products.manage') ? '' : 'disabled'}><option value="true" ${item.is_active ? 'selected' : ''}>Ativa</option><option value="false" ${item.is_active ? '' : 'selected'}>Inativa</option></select></td><td>${can('products.manage') ? '<button class="text-button save-category" type="button">Salvar</button>' : ''}</td></tr>`).join('');
}
function renderBrands() {
  brandsBody.innerHTML = brands.map((item) => `<tr data-id="${item.id}"><td><input class="table-input brand-name" value="${escapeHtml(item.name)}" ${can('products.manage') ? '' : 'disabled'}></td><td><select class="table-input brand-active" ${can('products.manage') ? '' : 'disabled'}><option value="true" ${item.is_active ? 'selected' : ''}>Ativa</option><option value="false" ${item.is_active ? '' : 'selected'}>Inativa</option></select></td><td>${can('products.manage') ? '<button class="text-button save-brand" type="button">Salvar</button>' : ''}</td></tr>`).join('');
}

function productPayload(form) {
  return {
    internalCode: form.internalCode.value,
    name: form.name.value,
    categoryId: form.categoryId.value || null,
    brandId: form.brandId.value || null,
    model: form.model.value || null,
    audience: form.audience.value || null,
    collectionName: form.collectionName.value || null,
    material: form.material.value || null,
    baseCostPrice: form.baseCostPrice.value,
    baseSalePrice: form.baseSalePrice.value,
    promotionalPrice: form.promotionalPrice.value || null,
    description: form.description.value || null,
    isActive: form.isActive ? form.isActive.checked : true,
    isFeatured: form.isFeatured.checked,
    isCatalogVisible: form.isCatalogVisible.checked
  };
}

async function loadTaxonomies() {
  const [categoryResponse, brandResponse] = await Promise.all([api('/api/categories'), api('/api/brands')]);
  categories = categoryResponse.data;
  brands = brandResponse.data;
  renderCategories(); renderBrands(); refreshSelects();
}

async function loadProducts(page = currentPage) {
  const params = new URLSearchParams();
  params.set('page', String(page)); params.set('pageSize', '20');
  for (const name of ['q','categoryId','brandId','isActive','isCatalogVisible']) if (filtersForm[name].value) params.set(name, filtersForm[name].value);
  const response = await api(`/api/products?${params}`);
  currentPage = response.pagination.page; totalPages = response.pagination.totalPages;
  document.getElementById('product-count').textContent = `${response.pagination.total} produto(s)`;
  document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
  productsBody.innerHTML = response.data.map((item) => `<tr><td><div class="product-cell">${item.primary_image ? `<img src="${escapeHtml(item.primary_image)}" alt="">` : '<span class="image-placeholder">NM</span>'}<div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.internal_code)}${item.model ? ` · ${escapeHtml(item.model)}` : ''}</small></div></div></td><td>${escapeHtml(item.category_name || '—')}</td><td>${escapeHtml(item.brand_name || '—')}</td><td>${money(item.promotional_price ?? item.base_sale_price)}</td><td>${item.is_catalog_visible ? 'Publicado' : 'Oculto'}</td><td>${item.is_active ? 'Ativo' : 'Inativo'}</td><td class="actions"><button class="text-button edit-product" data-id="${item.id}" type="button">Editar</button><button class="text-button images-product" data-id="${item.id}" data-name="${escapeHtml(item.name)}" type="button">Imagens</button></td></tr>`).join('');
}

async function openProduct(id) {
  const response = await api(`/api/products/${id}`);
  const item = response.data;
  productEditForm.id.value = item.id;
  productEditForm.internalCode.value = item.internal_code;
  productEditForm.name.value = item.name;
  productEditForm.categoryId.innerHTML = categoryOptions(selectedValue(item.category_id));
  productEditForm.brandId.innerHTML = brandOptions(selectedValue(item.brand_id));
  productEditForm.model.value = item.model || '';
  productEditForm.audience.value = item.audience || '';
  productEditForm.collectionName.value = item.collection_name || '';
  productEditForm.material.value = item.material || '';
  productEditForm.baseCostPrice.value = item.base_cost_price;
  productEditForm.baseSalePrice.value = item.base_sale_price;
  productEditForm.promotionalPrice.value = item.promotional_price || '';
  productEditForm.description.value = item.description || '';
  productEditForm.isActive.checked = Boolean(item.is_active);
  productEditForm.isFeatured.checked = Boolean(item.is_featured);
  productEditForm.isCatalogVisible.checked = Boolean(item.is_catalog_visible);
  [...productEditForm.elements].forEach((element) => { if (element.name !== 'id') element.disabled = !can('products.manage'); });
  productDialog.showModal();
}

async function loadImages(productId, productName = '') {
  currentImageProductId = String(productId);
  document.getElementById('images-title').textContent = productName ? `Imagens — ${productName}` : 'Imagens do produto';
  const response = await api(`/api/products/${productId}`);
  imageUploadForm.hidden = !can('products.manage');
  imageGallery.innerHTML = response.data.images.length ? response.data.images.map((image) => `<figure class="image-card"><img src="${escapeHtml(image.file_path)}" alt="${escapeHtml(image.alt_text || '')}"><figcaption><span>${image.is_primary ? 'Principal' : `Ordem ${image.sort_order}`}</span>${can('products.manage') ? `<div><button class="text-button set-primary" data-image-id="${image.id}" type="button" ${image.is_primary ? 'disabled' : ''}>Principal</button><button class="text-button remove-image" data-image-id="${image.id}" type="button">Remover</button></div>` : ''}</figcaption></figure>`).join('') : '<p class="muted">Nenhuma imagem cadastrada.</p>';
  if (!imagesDialog.open) imagesDialog.showModal();
}

async function initialize() {
  try {
    const session = await api('/api/auth/me');
    permissions = session.permissions;
    if (!can('products.read')) throw new Error('Você não possui permissão para consultar produtos.');
    const manageable = can('products.manage');
    categoryForm.hidden = !manageable;
    brandForm.hidden = !manageable;
    toggleProductCreate.hidden = !manageable;
    productCreateCard.hidden = true;
    await loadTaxonomies();
    await loadProducts(1);
    setFeedback('Produtos atualizados.');
  } catch (error) { setFeedback(error.message, true); }
}

toggleProductCreate?.addEventListener('click', () => setCreatePanel(productCreateCard.hidden));
closeProductCreate?.addEventListener('click', () => setCreatePanel(false));
categoryForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/categories', { method:'POST', body:JSON.stringify({ name:categoryForm.name.value, parentId:categoryForm.parentId.value || null }) }); categoryForm.reset(); await loadTaxonomies(); setFeedback('Categoria criada.'); } catch (error) { setFeedback(error.message, true); } });
brandForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/brands', { method:'POST', body:JSON.stringify({ name:brandForm.name.value }) }); brandForm.reset(); await loadTaxonomies(); setFeedback('Marca criada.'); } catch (error) { setFeedback(error.message, true); } });
productForm.addEventListener('submit', async (event) => { event.preventDefault(); try { const created = await api('/api/products', { method:'POST', body:JSON.stringify(productPayload(productForm)) }); productForm.reset(); productForm.baseCostPrice.value='0.00'; productForm.baseSalePrice.value='0.00'; await loadProducts(1); setCreatePanel(false); setFeedback(`Produto #${created.id} criado.`); } catch (error) { setFeedback(error.message, true); } });

categoriesBody.addEventListener('click', async (event) => { if (!event.target.classList.contains('save-category')) return; const row = event.target.closest('tr'); try { await api(`/api/categories/${row.dataset.id}`, { method:'PATCH', body:JSON.stringify({ name:row.querySelector('.category-name').value, parentId:row.querySelector('.category-parent').value || null, isActive:row.querySelector('.category-active').value === 'true' }) }); await loadTaxonomies(); setFeedback('Categoria atualizada.'); } catch (error) { setFeedback(error.message, true); } });
brandsBody.addEventListener('click', async (event) => { if (!event.target.classList.contains('save-brand')) return; const row = event.target.closest('tr'); try { await api(`/api/brands/${row.dataset.id}`, { method:'PATCH', body:JSON.stringify({ name:row.querySelector('.brand-name').value, isActive:row.querySelector('.brand-active').value === 'true' }) }); await loadTaxonomies(); setFeedback('Marca atualizada.'); } catch (error) { setFeedback(error.message, true); } });
productsBody.addEventListener('click', async (event) => { const id = event.target.dataset.id; if (event.target.classList.contains('edit-product')) { try { await openProduct(id); } catch (error) { setFeedback(error.message, true); } } if (event.target.classList.contains('images-product')) { try { await loadImages(id, event.target.dataset.name); } catch (error) { setFeedback(error.message, true); } } });
productEditForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!can('products.manage')) return productDialog.close(); try { await api(`/api/products/${productEditForm.id.value}`, { method:'PATCH', body:JSON.stringify(productPayload(productEditForm)) }); productDialog.close(); await loadProducts(); setFeedback('Produto atualizado.'); } catch (error) { setFeedback(error.message, true); } });
document.getElementById('cancel-product-edit').addEventListener('click', () => productDialog.close());
filtersForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await loadProducts(1); } catch (error) { setFeedback(error.message, true); } });
document.getElementById('refresh-products').addEventListener('click', () => loadProducts().catch((error) => setFeedback(error.message, true)));
document.getElementById('prev-page').addEventListener('click', () => loadProducts(currentPage - 1).catch((error) => setFeedback(error.message, true)));
document.getElementById('next-page').addEventListener('click', () => loadProducts(currentPage + 1).catch((error) => setFeedback(error.message, true)));

imageUploadForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!currentImageProductId) return; const formData = new FormData(imageUploadForm); try { const response = await api(`/api/products/${currentImageProductId}/images`, { method:'POST', body:formData }); imageUploadForm.reset(); setFeedback(`${response.data.length} imagem(ns) cadastrada(s) no total.`, false, imageFeedback); await loadImages(currentImageProductId); await loadProducts(); } catch (error) { setFeedback(error.message, true, imageFeedback); } });
imageGallery.addEventListener('click', async (event) => { const imageId = event.target.dataset.imageId; if (!imageId || !currentImageProductId) return; try { if (event.target.classList.contains('set-primary')) await api(`/api/products/${currentImageProductId}/images/${imageId}`, { method:'PATCH', body:JSON.stringify({ isPrimary:true }) }); if (event.target.classList.contains('remove-image')) await api(`/api/products/${currentImageProductId}/images/${imageId}`, { method:'DELETE' }); await loadImages(currentImageProductId); await loadProducts(); } catch (error) { setFeedback(error.message, true, imageFeedback); } });
document.getElementById('close-images').addEventListener('click', () => { imagesDialog.close(); currentImageProductId = null; });

initialize();
