'use strict';

(() => {
  if (window.__NM_BANKDASH_POLISH__) return;
  window.__NM_BANKDASH_POLISH__ = true;

  const SVG = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>',
    pos: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.3 10.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 8H6"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h12"/><path d="M16 12h5"/><circle cx="16" cy="12" r=".6" fill="currentColor" stroke="none"/></svg>',
    'catalog-orders': '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
    catalog: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></svg>',
    grade: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v15H4z"/><path d="M2 3h20v3H2z"/><path d="M9 10h6"/></svg>',
    customers: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v11H3z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
    purchases: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="m9 13 2 2 4-5"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>',
    imports: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7h14v-7"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M18 4.5 20 3l2 1.5v2.4c0 1.8-.8 3.2-2 4.1-1.2-.9-2-2.3-2-4.1V4.5Z"/></svg>',
    revenue: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18V8"/><path d="M9 18v-5"/><path d="M14 18V5"/><path d="M19 18v-8"/></svg>',
    sales: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h6"/></svg>',
    units: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/></svg>',
    receipts: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>',
    disbursements: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V8"/><path d="m7 13 5-5 5 5"/><path d="M5 3h14"/></svg>',
    net: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 12h5"/></svg>'
  };

  function keyFromHref(href) {
    const path = new URL(href, location.origin).pathname;
    if (path === '/catalog/' || path === '/catalog') return 'catalog';
    return path.split('/').pop()?.replace(/\.html$/i, '') || 'dashboard';
  }

  function initials(value) {
    return String(value || 'NM').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NM';
  }

  function normalizeLegacyShell() {
    document.querySelector('.sidebar-brand')?.classList.add('nm-sidebar-brand');
    document.querySelector('.sidebar-brand-copy')?.classList.add('nm-brand-copy');
    document.querySelectorAll('.sidebar-section').forEach((el) => el.classList.add('nm-nav-section'));
    document.querySelectorAll('.sidebar-label').forEach((el) => el.classList.add('nm-nav-label'));
    document.querySelectorAll('.app-nav').forEach((el) => el.classList.add('nm-nav-list'));
    document.querySelectorAll('.app-nav-link').forEach((el) => el.classList.add('nm-nav-link'));
    document.querySelectorAll('.nav-dot').forEach((el) => el.classList.add('nm-nav-icon'));
    document.querySelector('.sidebar-footer')?.classList.add('nm-sidebar-footer');

    const user = document.querySelector('.sidebar-user');
    if (user) {
      user.classList.add('nm-sidebar-user');
      if (!user.querySelector('.nm-avatar')) {
        const strong = user.querySelector('strong');
        const role = user.querySelector('span');
        const detail = document.createElement('div');
        const avatar = document.createElement('span');
        avatar.className = 'nm-avatar';
        avatar.id = 'shell-avatar';
        avatar.textContent = initials(strong?.textContent);
        if (strong) detail.appendChild(strong);
        if (role) detail.appendChild(role);
        user.replaceChildren(avatar, detail);
      }
    }

    document.querySelector('.sidebar-logout')?.classList.add('nm-logout-button');

    const topbar = document.querySelector('.app-topbar');
    if (topbar) {
      topbar.classList.add('nm-app-topbar');
      const legacyLeft = topbar.firstElementChild;
      if (legacyLeft) legacyLeft.classList.add('nm-topbar-left');
      topbar.querySelector('.topbar-context')?.classList.add('nm-topbar-context');
      topbar.querySelector('.topbar-actions')?.classList.add('nm-topbar-actions');
      topbar.querySelector('.nav-toggle')?.classList.add('nm-nav-toggle');
    }
  }

  function decorateNavigation() {
    document.querySelectorAll('.nm-nav-link, .app-nav-link').forEach((link) => {
      const key = keyFromHref(link.getAttribute('href') || '/');
      const icon = link.querySelector('.nm-nav-icon, .nav-dot');
      if (!icon) return;
      icon.classList.add('nm-nav-icon');
      icon.innerHTML = SVG[key] || SVG.dashboard;
      icon.setAttribute('aria-hidden', 'true');
    });
  }

  function visibleModules() {
    return [...document.querySelectorAll('.nm-nav-link')]
      .filter((link) => !link.hidden && link.offsetParent !== null)
      .map((link) => ({
        label: link.textContent.trim(),
        href: link.getAttribute('href'),
        section: link.closest('.nm-nav-section')?.querySelector('.nm-nav-label')?.textContent.trim() || 'Módulo'
      }))
      .filter((item, index, array) => item.href && array.findIndex((candidate) => candidate.href === item.href) === index);
  }

  function enhanceTopbar() {
    const actions = document.querySelector('.nm-topbar-actions, .topbar-actions');
    if (!actions || actions.querySelector('.nm-global-search')) return;
    actions.classList.add('nm-topbar-actions');

    const search = document.createElement('div');
    search.className = 'nm-global-search';
    search.innerHTML = `
      <div class="nm-global-search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input id="nm-global-search-input" type="search" placeholder="Buscar módulo..." autocomplete="off" aria-label="Buscar módulo do sistema" aria-expanded="false">
        <kbd aria-hidden="true">/</kbd>
      </div>
      <div id="nm-search-popover" class="nm-search-popover" hidden></div>`;
    actions.prepend(search);

    const avatar = document.createElement('span');
    avatar.className = 'nm-topbar-avatar';
    avatar.id = 'nm-topbar-avatar';
    avatar.setAttribute('aria-label', 'Usuário conectado');
    avatar.textContent = initials(document.getElementById('shell-user-name')?.textContent);
    actions.appendChild(avatar);

    const input = search.querySelector('input');
    const popover = search.querySelector('.nm-search-popover');
    let selected = 0;

    function render(query = '') {
      const normalized = query.trim().toLocaleLowerCase('pt-BR');
      const items = visibleModules().filter((item) => !normalized || `${item.label} ${item.section}`.toLocaleLowerCase('pt-BR').includes(normalized)).slice(0, 8);
      selected = 0;
      popover.innerHTML = items.length
        ? items.map((item, index) => `<a class="nm-search-result${index === 0 ? ' is-selected' : ''}" href="${item.href}"><span>${item.label}</span><small>${item.section}</small></a>`).join('')
        : '<div class="nm-search-empty">Nenhum módulo encontrado.</div>';
      popover.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function close() {
      popover.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function move(direction) {
      const results = [...popover.querySelectorAll('.nm-search-result')];
      if (!results.length) return;
      selected = (selected + direction + results.length) % results.length;
      results.forEach((item, index) => item.classList.toggle('is-selected', index === selected));
      results[selected].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
      if (event.key === 'Escape') { close(); input.blur(); }
      if (event.key === 'Enter') {
        const target = popover.querySelectorAll('.nm-search-result')[selected];
        if (target) { event.preventDefault(); location.assign(target.href); }
      }
    });

    document.addEventListener('click', (event) => {
      if (!search.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
      if (event.key === '/' && !typing && window.innerWidth > 760) {
        event.preventDefault();
        input.focus();
      }
    });

    const userName = document.getElementById('shell-user-name');
    if (userName) {
      const syncAvatar = () => { avatar.textContent = initials(userName.textContent); };
      syncAvatar();
      new MutationObserver(syncAvatar).observe(userName, { childList: true, characterData: true, subtree: true });
    }
  }

  function decorateKpis() {
    const icons = {
      'kpi-revenue': 'revenue',
      'kpi-sales': 'sales',
      'kpi-ticket': 'ticket',
      'kpi-units': 'units',
      'kpi-receipts': 'receipts',
      'kpi-disbursements': 'disbursements',
      'kpi-net': 'net',
      'kpi-open-cash': 'wallet'
    };

    Object.entries(icons).forEach(([id, key]) => {
      const value = document.getElementById(id);
      const card = value?.closest('.kpi-card');
      if (!card || card.querySelector('.nm-kpi-icon')) return;
      const icon = document.createElement('span');
      icon.className = 'nm-kpi-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SVG[key];
      card.prepend(icon);
    });
  }

  function markTables() {
    document.querySelectorAll('.table-wrap').forEach((wrap) => wrap.setAttribute('data-bankdash-table', 'true'));
  }

  normalizeLegacyShell();
  decorateNavigation();
  enhanceTopbar();
  decorateKpis();
  markTables();
  document.body.classList.add('nm-bankdash-ready');
})();
