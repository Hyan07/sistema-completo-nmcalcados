'use strict';

const quickGradeCard = document.getElementById('quick-grade-card');
const quickGradeForm = document.getElementById('quick-grade-form');
const quickGradeFeedback = document.getElementById('quick-grade-feedback');
const quickSizeOptions = document.getElementById('quick-size-options');
const quickProductSelect = document.getElementById('product-select');
const quickLoadGradeButton = document.getElementById('load-grade');

let quickCanManage = false;

function quickEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function setQuickFeedback(message, error = false) {
  quickGradeFeedback.textContent = message;
  quickGradeFeedback.classList.toggle('is-error', error);
}

async function quickApi(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Operação não concluída.');
  return data;
}

function syncQuickGradeVisibility() {
  quickGradeCard.hidden = !(quickCanManage && quickProductSelect.value);
}

async function loadQuickGradeOptions() {
  const [session, colorsResponse, sizesResponse] = await Promise.all([
    quickApi('/api/auth/me'),
    quickApi('/api/colors'),
    quickApi('/api/sizes')
  ]);

  quickCanManage = session.permissions.includes('products.manage');
  if (!quickCanManage) return syncQuickGradeVisibility();

  const colors = colorsResponse.data.filter((item) => item.is_active);
  const sizes = sizesResponse.data
    .filter((item) => item.is_active)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || String(a.label).localeCompare(String(b.label), 'pt-BR'));

  quickGradeForm.colorId.innerHTML = '<option value="">Selecione uma cor</option>' + colors
    .map((item) => `<option value="${item.id}">${quickEscape(item.name)}</option>`)
    .join('');

  quickSizeOptions.innerHTML = sizes.length
    ? sizes.map((item) => `<label class="quick-size-chip"><input type="checkbox" name="sizeId" value="${item.id}"><span>${quickEscape(item.label)}</span></label>`).join('')
    : '<p class="muted">Cadastre pelo menos um tamanho em Cadastros auxiliares.</p>';

  syncQuickGradeVisibility();
}

quickProductSelect.addEventListener('change', () => {
  syncQuickGradeVisibility();
  setQuickFeedback('');
});

quickLoadGradeButton.addEventListener('click', () => {
  window.setTimeout(syncQuickGradeVisibility, 0);
});

quickGradeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const productId = quickProductSelect.value;
  const colorId = quickGradeForm.colorId.value;
  const sizeIds = [...quickGradeForm.querySelectorAll('input[name="sizeId"]:checked')].map((input) => Number(input.value));

  if (!productId) return setQuickFeedback('Selecione um produto.', true);
  if (!colorId) return setQuickFeedback('Selecione uma cor.', true);
  if (!sizeIds.length) return setQuickFeedback('Marque pelo menos um tamanho.', true);

  const submitButton = quickGradeForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await quickApi(`/api/products/${productId}/grade/quick`, {
      method: 'POST',
      body: JSON.stringify({ colorId: Number(colorId), sizeIds })
    });

    const result = response.data;
    quickGradeForm.querySelectorAll('input[name="sizeId"]').forEach((input) => { input.checked = false; });
    setQuickFeedback(`Grade atualizada: ${result.created} combinação(ões) criada(s), ${result.reactivated} reativada(s).`);
    quickLoadGradeButton.click();
  } catch (error) {
    setQuickFeedback(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

loadQuickGradeOptions().catch((error) => setQuickFeedback(error.message, true));
