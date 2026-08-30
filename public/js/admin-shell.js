'use strict';

(() => {
  if (window.__NM_ADMIN_SHELL__) return;
  window.__NM_ADMIN_SHELL__ = true;

  const NAV_GROUPS = [
    {
      label: 'Visão geral',
      items: [
        ['dashboard', 'layout-dashboard', 'Dashboard', '/pages/dashboard.html', 'dashboard.read']
      ]
    },
    {
      label: 'Comercial',
      items: [
        ['pos', 'shopping-cart', 'Vendas / PDV', '/pages/pos.html', 'sales.read'],
        ['customers', 'users', 'Clientes', '/pages/customers.html', 'customers.read'],
        ['catalog-orders', 'clipboard-list', 'Pedidos do catálogo', '/pages/catalog-orders.html', 'catalog.orders.read'],
        ['catalog', 'store', 'Catálogo público', '/catalog/', null]
      ]
    },
    {
      label: 'Estoque',
      items: [
        ['products', 'package', 'Produtos', '/pages/products.html', 'products.read'],
        ['grade', 'grid-3x3', 'Grade', '/pages/grade.html', 'products.read'],
        ['stock', 'boxes', 'Estoque', '/pages/stock.html', 'stock.read'],
        ['purchases', 'truck', 'Compras', '/pages/purchases.html', 'purchases.read'],
        ['suppliers', 'building', 'Fornecedores', '/pages/suppliers.html', 'suppliers.read']
      ]
    },
    {
      label: 'Financeiro',
      items: [
        ['cash', 'wallet', 'Caixa', '/pages/cash.html', 'cash.read'],
        ['finance', 'landmark', 'Financeiro', '/pages/finance.html', 'finance.read']
      ]
    },
    {
      label: 'Gestão',
      items: [
        ['reports', 'bar-chart', 'Relatórios', '/pages/reports.html', 'reports.read'],
        ['imports', 'upload', 'Importações', '/pages/imports.html', 'imports.read'],
        ['users', 'shield-user', 'Usuários e acessos', '/pages/users.html', 'users.read']
      ]
    }
  ];

  const PAGE_META = {
    dashboard: { title: 'Dashboard', description: 'Indicadores e visão consolidada do negócio.', group: 'Visão geral' },
    pos: { title: 'Vendas / PDV', description: 'Venda rápida com estoque e pagamentos integrados.', group: 'Comercial' },
    customers: { title: 'Clientes', description: 'Cadastro, contatos e histórico comercial.', group: 'Comercial' },
    'catalog-orders': { title: 'Pedidos do catálogo', description: 'Atendimento dos pedidos e reservas recebidos online.', group: 'Comercial' },
    products: { title: 'Produtos', description: 'Cadastro comercial, categorias, marcas e imagens.', group: 'Estoque' },
    grade: { title: 'Grade de produtos', description: 'Cores, tamanhos, SKUs e preços por combinação.', group: 'Estoque' },
    stock: { title: 'Estoque', description: 'Saldo físico, movimentações, contagem e alertas.', group: 'Estoque' },
    purchases: { title: 'Compras', description: 'Pedidos, recebimentos e entrada real de estoque.', group: 'Estoque' },
    suppliers: { title: 'Fornecedores', description: 'Cadastro e relacionamento de compras.', group: 'Estoque' },
    cash: { title: 'Caixa', description: 'Abertura, movimentações e fechamento com rastreabilidade.', group: 'Financeiro' },
    finance: { title: 'Financeiro', description: 'Contas, liquidações e fluxo financeiro.', group: 'Financeiro' },
    reports: { title: 'Relatórios', description: 'Análises e exportações operacionais.', group: 'Gestão' },
    imports: { title: 'Importações', description: 'Entrada segura e validada de dados.', group: 'Gestão' },
    users: { title: 'Usuários e acessos', description: 'Funções, permissões e segurança de acesso.', group: 'Gestão' }
  };

  const ICONS = {
    'layout-dashboard': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'shopping-cart': '<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.3a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'clipboard-list': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    store: '<path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8"/><path d="M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    package: '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/>',
    'grid-3x3': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    boxes: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    truck: '<path d="M3 5h11v12H3z"/><path d="M14 9h4l3 3v5h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    building: '<path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h1M17 17h1"/><path d="M2 21h20"/>',
    wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 12h5"/>',
    landmark: '<path d="M3 9h18L12 3 3 9Z"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    'bar-chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    upload: '<path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7h14v-7"/>',
    'shield-user': '<circle cx="10" cy="8" r="3"/><path d="M4 18a6 6 0 0 1 12 0"/><path d="M17 4.5 20 3l3 1.5v4c0 2.5-1.2 4.4-3 5.5-1.8-1.1-3-3-3-5.5v-4Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5"/>'
  };

  function svg(name, label = '') {
    const title = label ? `<title>${label}</title>` : '';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${title}${ICONS[name] || ICONS.package}</svg>`;
  }

  function currentModule() {
    const pathName = location.pathname.split('/').pop()?.replace(/\.html$/i, '') || 'dashboard';
    return PAGE_META[pathName] ? pathName : 'dashboard';
  }

  function initials(value) {
    return String(value || 'NM').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NM';
  }

  function navMarkup(activeModule) {
    return NAV_GROUPS.map((group) => `
      <section class="nm-nav-section">
        <p class="nm-nav-label">${group.label}</p>
        <div class="nm-nav-list">
          ${group.items.map(([key, iconName, label, href, permission]) => `
            <a class="nm-nav-link${key === activeModule ? ' is-active' : ''}" href="${href}" data-tooltip="${label}"${permission ? ` data-permission="${permission}" hidden` : ''}${key === activeModule ? ' aria-current="page"' : ''}>
              <span class="nm-nav-icon">${svg(iconName)}</span>
              <span>${label}</span>
            </a>`).join('')}
        </div>
      </section>`).join('');
  }

  function buildSidebar(activeModule) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar nm-app-sidebar';
    sidebar.id = 'app-sidebar';
    sidebar.innerHTML = `
      <div class="nm-sidebar-brand">
        <div class="nm-brand-mark" aria-hidden="true">NM</div>
        <div class="nm-brand-copy"><strong>NM Calçados</strong><span>Gestão comercial</span></div>
        <button id="sidebar-collapse" class="nm-sidebar-collapse" type="button" aria-label="Recolher menu" aria-pressed="false">${svg('chevron')}</button>
      </div>
      <nav class="nm-nav" aria-label="Navegação principal">${navMarkup(activeModule)}</nav>
      <footer class="nm-sidebar-footer">
        <button id="shell-user-menu-button" class="nm-sidebar-user" type="button" aria-haspopup="menu" aria-expanded="false">
          <span class="nm-avatar" id="shell-avatar">NM</span>
          <span class="nm-sidebar-user-copy"><strong id="shell-user-name">Usuário</strong><span id="shell-user-role">Validando sessão...</span></span>
          ${svg('chevron-down')}
        </button>
        <div id="shell-user-menu" class="nm-user-menu" role="menu" hidden>
          <button id="shell-logout" type="button" role="menuitem">${svg('logout')}<span>Encerrar sessão</span></button>
        </div>
      </footer>`;
    return sidebar;
  }

  function buildTopbar(meta) {
    const topbar = document.createElement('header');
    topbar.className = 'app-topbar nm-app-topbar';
    topbar.innerHTML = `
      <div class="nm-topbar-left">
        <button id="nav-toggle" class="nm-nav-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">${svg('menu')}</button>
        <nav class="nm-breadcrumb" aria-label="Breadcrumb">
          <a href="/pages/dashboard.html" data-permission="dashboard.read">Início</a>
          <span class="nm-breadcrumb-separator" aria-hidden="true">/</span>
          <span class="nm-breadcrumb-group">${meta.group}</span>
          <span class="nm-breadcrumb-separator" aria-hidden="true">/</span>
          <span aria-current="page">${meta.title}</span>
        </nav>
      </div>
      <div class="nm-topbar-actions">
        <div class="nm-global-search">
          <div class="nm-global-search-box">
            ${svg('search')}
            <input id="nm-global-search-input" type="search" placeholder="Buscar módulo..." autocomplete="off" aria-label="Buscar módulo do sistema" aria-expanded="false">
            <kbd aria-hidden="true">/</kbd>
          </div>
          <div id="nm-search-popover" class="nm-search-popover" hidden></div>
        </div>
        <span class="nm-system-status"><i></i>Sistema disponível</span>
      </div>`;
    return topbar;
  }

  function ensureShell(activeModule, meta) {
    const main = document.querySelector('main.admin-shell, main.dashboard-shell');
    if (!main) return null;

    document.body.classList.add('admin-body', 'nm-admin-shell');
    document.body.dataset.module = activeModule;

    let frame = main.closest('.app-frame, .nm-app-frame');
    let appMain = main.closest('.app-main, .nm-app-main');
    const sidebar = buildSidebar(activeModule);
    const topbar = buildTopbar(meta);

    if (!frame) {
      frame = document.createElement('div');
      frame.className = 'app-frame nm-app-frame';
      appMain = document.createElement('div');
      appMain.className = 'app-main nm-app-main';
      main.parentNode.insertBefore(frame, main);
      frame.append(sidebar, appMain);
      appMain.append(topbar, main);
    } else {
      frame.classList.add('nm-app-frame');
      const oldSidebar = frame.querySelector(':scope > .app-sidebar, :scope > .nm-app-sidebar');
      oldSidebar?.remove();
      frame.prepend(sidebar);

      if (!appMain) {
        appMain = document.createElement('div');
        appMain.className = 'app-main nm-app-main';
        frame.appendChild(appMain);
        appMain.appendChild(main);
      } else {
        appMain.classList.add('nm-app-main');
      }

      const oldTopbar = appMain.querySelector(':scope > .app-topbar, :scope > .nm-app-topbar');
      if (oldTopbar) oldTopbar.replaceWith(topbar);
      else appMain.prepend(topbar);
    }

    document.getElementById('nav-backdrop')?.remove();
    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.id = 'nav-backdrop';
    backdrop.className = 'nm-nav-backdrop';
    backdrop.setAttribute('aria-label', 'Fechar menu');
    document.body.appendChild(backdrop);

    const header = main.querySelector(':scope > .admin-header, :scope > .dashboard-page-header');
    if (header) {
      header.classList.add('nm-page-header');
      const eyebrow = header.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = meta.group;
      const subtitle = header.querySelector('.muted, .subtitle');
      if (subtitle && !subtitle.textContent.trim()) subtitle.textContent = meta.description;
      header.querySelector('.session-actions')?.classList.add('nm-page-actions');
    }

    return { frame, appMain, sidebar, topbar, main };
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível validar a sessão.');
    return body;
  }

  function applyPermissions(permissions) {
    const allowed = new Set(permissions || []);
    document.querySelectorAll('[data-permission]').forEach((element) => {
      element.hidden = !allowed.has(element.dataset.permission);
    });
  }

  function bindNavigation() {
    const toggle = document.getElementById('nav-toggle');
    const backdrop = document.getElementById('nav-backdrop');
    const sidebar = document.getElementById('app-sidebar');

    const close = () => {
      document.body.classList.remove('nav-open');
      toggle?.setAttribute('aria-expanded', 'false');
    };

    toggle?.addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    backdrop?.addEventListener('click', close);
    sidebar?.addEventListener('click', (event) => {
      if (event.target.closest('.nm-nav-link') && matchMedia('(max-width: 920px)').matches) close();
    });
  }

  function bindSidebarCollapse() {
    const button = document.getElementById('sidebar-collapse');
    if (!button) return;

    let collapsed = false;
    try { collapsed = localStorage.getItem('nm.sidebar.collapsed') === '1'; } catch (_) { collapsed = false; }
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    button.setAttribute('aria-pressed', String(collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');

    button.addEventListener('click', () => {
      collapsed = !document.body.classList.contains('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      button.setAttribute('aria-pressed', String(collapsed));
      button.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
      try { localStorage.setItem('nm.sidebar.collapsed', collapsed ? '1' : '0'); } catch (_) {}
    });
  }

  function visibleModules() {
    return [...document.querySelectorAll('.nm-nav-link')]
      .filter((link) => !link.hidden)
      .map((link) => ({
        label: link.textContent.trim(),
        href: link.getAttribute('href'),
        group: link.closest('.nm-nav-section')?.querySelector('.nm-nav-label')?.textContent.trim() || 'Módulo'
      }))
      .filter((item, index, array) => item.href && array.findIndex((candidate) => candidate.href === item.href) === index);
  }

  function bindGlobalSearch() {
    const search = document.querySelector('.nm-global-search');
    const input = document.getElementById('nm-global-search-input');
    const popover = document.getElementById('nm-search-popover');
    if (!search || !input || !popover) return;

    let selected = 0;

    const close = () => {
      popover.hidden = true;
      search.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
    };

    const render = () => {
      const query = input.value.trim().toLocaleLowerCase('pt-BR');
      const matches = visibleModules().filter((item) => !query || `${item.label} ${item.group}`.toLocaleLowerCase('pt-BR').includes(query)).slice(0, 9);
      selected = 0;
      popover.replaceChildren();

      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'nm-search-empty';
        empty.textContent = 'Nenhum módulo encontrado.';
        popover.appendChild(empty);
      } else {
        matches.forEach((item, index) => {
          const link = document.createElement('a');
          link.className = `nm-search-result${index === 0 ? ' is-selected' : ''}`;
          link.href = item.href;
          const label = document.createElement('span');
          label.textContent = item.label;
          const group = document.createElement('small');
          group.textContent = item.group;
          link.append(label, group);
          popover.appendChild(link);
        });
      }

      popover.hidden = false;
      search.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    };

    const move = (direction) => {
      const results = [...popover.querySelectorAll('.nm-search-result')];
      if (!results.length) return;
      selected = (selected + direction + results.length) % results.length;
      results.forEach((result, index) => result.classList.toggle('is-selected', index === selected));
      results[selected].scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
      if (event.key === 'Enter') {
        const selectedResult = popover.querySelector('.nm-search-result.is-selected');
        if (selectedResult) { event.preventDefault(); location.assign(selectedResult.href); }
      }
      if (event.key === 'Escape') close();
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
      if (event.key === '/' && !typing) {
        event.preventDefault();
        input.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.nm-global-search')) close();
    });
  }

  function bindUserMenu() {
    const button = document.getElementById('shell-user-menu-button');
    const menu = document.getElementById('shell-user-menu');
    const logout = document.getElementById('shell-logout');
    if (!button || !menu) return;

    const close = () => {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });

    logout?.addEventListener('click', async () => {
      logout.disabled = true;
      try { await request('/api/auth/logout', { method: 'POST' }); }
      finally { location.assign('/'); }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.nm-sidebar-footer')) close();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  function enhanceFeedback() {
    document.querySelectorAll('.feedback').forEach((feedback) => {
      feedback.setAttribute('aria-live', feedback.getAttribute('aria-live') || 'polite');
      const sync = () => feedback.classList.toggle('has-message', Boolean(feedback.textContent.trim()));
      sync();
      new MutationObserver(sync).observe(feedback, { childList: true, characterData: true, subtree: true });
    });
  }

  function markDangerActions() {
    document.querySelectorAll('button, .secondary-link').forEach((element) => {
      if (/excluir|desativar|estornar|cancelar venda/i.test(element.textContent.trim())) element.classList.add('nm-danger-action');
    });
  }

  const moduleName = currentModule();
  const meta = PAGE_META[moduleName];
  const shell = ensureShell(moduleName, meta);
  if (!shell) return;

  bindNavigation();
  bindSidebarCollapse();
  bindGlobalSearch();
  bindUserMenu();
  enhanceFeedback();
  markDangerActions();

  request('/api/auth/me')
    .then((data) => {
      const user = data.user || {};
      const roles = (user.roles || []).map((role) => role.name).join(' + ') || 'Sessão ativa';
      const name = user.name || user.username || 'Usuário';
      const nameElement = document.getElementById('shell-user-name');
      const roleElement = document.getElementById('shell-user-role');
      const avatarElement = document.getElementById('shell-avatar');
      if (nameElement) nameElement.textContent = name;
      if (roleElement) roleElement.textContent = roles;
      if (avatarElement) avatarElement.textContent = initials(name);
      applyPermissions(data.permissions || []);
    })
    .catch(() => location.replace('/'));
})();
