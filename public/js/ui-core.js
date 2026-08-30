'use strict';

(() => {
  if (window.__NM_UI_CORE__) return;
  window.__NM_UI_CORE__ = true;

  const STATUS_MAP = new Map([
    ['ativo', 'success'], ['ativa', 'success'], ['publicado', 'success'], ['aberto', 'success'], ['aberta', 'success'],
    ['pago', 'success'], ['paga', 'success'], ['recebido', 'success'], ['recebida', 'success'], ['concluída', 'success'], ['concluido', 'success'],
    ['completed', 'success'], ['paid', 'success'], ['received', 'success'], ['ok', 'success'], ['open', 'info'],
    ['pendente', 'warning'], ['parcial', 'warning'], ['partial', 'warning'], ['partially_received', 'warning'], ['rascunho', 'warning'], ['draft', 'warning'],
    ['vencido', 'danger'], ['vencida', 'danger'], ['cancelado', 'danger'], ['cancelada', 'danger'], ['cancelled', 'danger'], ['inativo', 'danger'], ['inativa', 'danger'],
    ['oculto', 'neutral'], ['oculta', 'neutral'], ['inactive', 'neutral']
  ]);
  const LOADING_RE = /carregando|atualizando|buscando|processando|validando|salvando|enviando|gerando|aplicando/i;
  const EMPTY_RE = /^(nenhum|nenhuma|sem |não há|nao ha)/i;
  const DANGER_RE = /excluir|remover|estornar|cancelar venda|fechar caixa|encerrar sessão/i;
  const MONEY_RE = /valor|total|custo|preço|preco|saldo|recebido|pago|pagamento|faturamento|receita|despesa|fluxo|unitário|unitario/i;

  function ensureRegion() {
    if (!document.getElementById('nm-network-bar')) {
      const bar = document.createElement('div');
      bar.id = 'nm-network-bar';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    if (!document.getElementById('nm-toast-region')) {
      const region = document.createElement('div');
      region.id = 'nm-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      document.body.appendChild(region);
    }
  }

  function toast(message, options = {}) {
    const text = String(message || '').trim();
    if (!text) return;
    ensureRegion();
    const region = document.getElementById('nm-toast-region');
    const type = ['success','error','warning','info'].includes(options.type) ? options.type : 'info';
    const titleMap = { success: 'Concluído', error: 'Não foi possível concluir', warning: 'Atenção', info: 'Informação' };
    const item = document.createElement('div');
    item.className = `nm-toast is-${type}`;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.innerHTML = `<i aria-hidden="true"></i><div><strong>${escapeHtml(options.title || titleMap[type])}</strong><span>${escapeHtml(text)}</span></div><button type="button" aria-label="Fechar notificação">×</button>`;
    const close = () => item.remove();
    item.querySelector('button').addEventListener('click', close);
    region.appendChild(item);
    window.setTimeout(close, Number(options.duration || (type === 'error' ? 6500 : 4200)));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function networkStart() {
    ensureRegion();
    const bar = document.getElementById('nm-network-bar');
    bar.classList.remove('is-finishing');
    bar.classList.add('is-active');
  }

  function networkFinish() {
    const bar = document.getElementById('nm-network-bar');
    if (!bar) return;
    bar.classList.remove('is-active');
    bar.classList.add('is-finishing');
    window.setTimeout(() => bar.classList.remove('is-finishing'), 260);
  }

  function wrapFetch() {
    if (window.fetch.__nmWrapped) return;
    const originalFetch = window.fetch.bind(window);
    let pending = 0;
    const wrapped = async (...args) => {
      pending += 1;
      if (pending === 1) networkStart();
      try { return await originalFetch(...args); }
      finally {
        pending = Math.max(0, pending - 1);
        if (!pending) networkFinish();
      }
    };
    wrapped.__nmWrapped = true;
    window.fetch = wrapped;
  }

  function statusClass(value) {
    const key = String(value || '').trim().toLocaleLowerCase('pt-BR');
    return STATUS_MAP.get(key) || null;
  }

  function enhanceStatusCell(cell) {
    if (!cell || cell.querySelector('button,input,select,a,.nm-badge,.status-badge')) return;
    const text = cell.textContent.trim();
    const type = statusClass(text);
    if (!type) return;
    const badge = document.createElement('span');
    badge.className = `nm-badge${type === 'neutral' ? '' : ` is-${type}`}`;
    badge.textContent = text;
    cell.replaceChildren(badge);
  }

  function emptyState(cell) {
    const text = cell.textContent.trim();
    if (!EMPTY_RE.test(text)) return;
    const row = cell.parentElement;
    if (!row || row.children.length !== 1) return;
    row.classList.add('nm-empty-row');
    const colspan = Number(cell.getAttribute('colspan') || 1);
    cell.colSpan = Math.max(colspan, row.closest('table')?.querySelectorAll('thead th').length || colspan);
    if (cell.querySelector('.nm-empty-state')) return;
    cell.innerHTML = `<div class="nm-empty-state"><span class="nm-empty-icon" aria-hidden="true">—</span><strong>${escapeHtml(text)}</strong><p>Altere os filtros ou cadastre novos registros quando a ação estiver disponível.</p></div>`;
  }

  function enhanceTable(table) {
    if (!table) return;
    table.classList.add('nm-responsive-table');
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    headers.forEach((header, index) => {
      if (MONEY_RE.test(header)) table.querySelectorAll(`tbody tr > td:nth-child(${index + 1})`).forEach((cell) => cell.classList.add('money'));
    });
    table.querySelectorAll('tbody tr').forEach((row) => {
      const cells = [...row.children].filter((el) => el.tagName === 'TD');
      if (cells.length === 1) emptyState(cells[0]);
      cells.forEach((cell, index) => {
        if (!cell.dataset.label) cell.dataset.label = headers[index] || 'Informação';
        enhanceStatusCell(cell);
      });
    });
  }

  function enhanceFeedback(node) {
    if (!node || node.dataset.nmFeedbackReady === '1') return;
    node.dataset.nmFeedbackReady = '1';
    node.setAttribute('aria-live', node.getAttribute('aria-live') || 'polite');
    node.setAttribute('role', node.getAttribute('role') || 'status');
    let lastToast = '';
    const sync = () => {
      const text = node.textContent.trim();
      node.classList.toggle('has-message', Boolean(text));
      if (!text || LOADING_RE.test(text) || text === lastToast) return;
      lastToast = text;
      toast(text, { type: node.classList.contains('is-error') ? 'error' : 'success' });
    };
    sync();
    new MutationObserver(sync).observe(node, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  function enhanceButtons(root = document) {
    root.querySelectorAll('button').forEach((button) => {
      const text = button.textContent.trim();
      if (DANGER_RE.test(text)) button.classList.add('nm-danger-action');
      if (!button.getAttribute('aria-label') && !text && button.title) button.setAttribute('aria-label', button.title);
    });
  }

  function enhanceTables(root = document) {
    root.querySelectorAll('table').forEach(enhanceTable);
  }

  function enhanceFeedbacks(root = document) {
    root.querySelectorAll('.feedback').forEach(enhanceFeedback);
  }

  function enhance(root = document) {
    enhanceButtons(root);
    enhanceTables(root);
    enhanceFeedbacks(root);
  }

  function observeDynamicContent() {
    const main = document.querySelector('main') || document.body;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        enhance(main);
      });
    });
    observer.observe(main, { childList:true, subtree:true });
  }

  ensureRegion();
  wrapFetch();
  enhance();
  observeDynamicContent();

  window.NMUI = Object.freeze({ toast, enhance, networkStart, networkFinish });
})();
