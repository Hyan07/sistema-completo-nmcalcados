'use strict';

(() => {
  if (window.__NM_ADMIN_SHELL__) return;
  window.__NM_ADMIN_SHELL__ = true;

  const NAV_GROUPS = [
    { label: 'Visão geral', items: [
      ['dashboard', 'DB', 'Dashboard', '/pages/dashboard.html', 'dashboard.read'],
      ['reports', 'RL', 'Relatórios', '/pages/reports.html', 'reports.read']
    ]},
    { label: 'Operação', items: [
      ['pos', 'PDV', 'PDV', '/pages/pos.html', 'sales.read'],
      ['cash', 'CX', 'Caixa', '/pages/cash.html', 'cash.read'],
      ['catalog-orders', 'PC', 'Pedidos do catálogo', '/pages/catalog-orders.html', 'catalog.orders.read'],
      ['catalog', 'CT', 'Catálogo público', '/catalog/', null]
    ]},
    { label: 'Comercial', items: [
      ['products', 'PR', 'Produtos', '/pages/products.html', 'products.read'],
      ['grade', 'GR', 'Grade', '/pages/grade.html', 'products.read'],
      ['stock', 'ES', 'Estoque', '/pages/stock.html', 'stock.read'],
      ['customers', 'CL', 'Clientes', '/pages/customers.html', 'customers.read'],
      ['suppliers', 'FO', 'Fornecedores', '/pages/suppliers.html', 'suppliers.read'],
      ['purchases', 'CO', 'Compras', '/pages/purchases.html', 'purchases.read']
    ]},
    { label: 'Gestão', items: [
      ['finance', 'FN', 'Financeiro', '/pages/finance.html', 'finance.read'],
      ['imports', 'IM', 'Importações', '/pages/imports.html', 'imports.read'],
      ['users', 'US', 'Usuários', '/pages/users.html', 'users.read']
    ]}
  ];

  const PAGE_META = {
    dashboard: ['Dashboard executivo', 'Indicadores e visão consolidada do negócio', 'Visão geral'],
    pos: ['Ponto de venda', 'Venda rápida com estoque e pagamentos integrados', 'Operação'],
    cash: ['Caixa', 'Abertura, movimentações e fechamento com rastreabilidade', 'Operação'],
    'catalog-orders': ['Pedidos do catálogo', 'Atendimento dos pedidos e reservas recebidos online', 'Operação'],
    products: ['Produtos', 'Cadastro comercial, categorias, marcas e imagens', 'Comercial'],
    grade: ['Grade de produtos', 'Cores, tamanhos, SKUs e preços por combinação', 'Comercial'],
    stock: ['Estoque', 'Saldo físico, movimentações, contagem e alertas', 'Comercial'],
    customers: ['Clientes', 'Cadastro, contatos e histórico comercial', 'Comercial'],
    suppliers: ['Fornecedores', 'Cadastro e relacionamento de compras', 'Comercial'],
    purchases: ['Compras', 'Pedidos, recebimentos e entrada real de estoque', 'Comercial'],
    finance: ['Financeiro', 'Contas, liquidações e fluxo financeiro', 'Gestão'],
    reports: ['Relatórios', 'Análises e exportações operacionais', 'Visão geral'],
    imports: ['Importações', 'Entrada segura e validada de dados', 'Gestão'],
    users: ['Usuários e acessos', 'Perfis, cargos e permissões do sistema', 'Gestão']
  };

  function currentModule() {
    const name = location.pathname.split('/').pop()?.replace(/\.html$/i, '') || 'dashboard';
    return PAGE_META[name] ? name : 'dashboard';
  }

  function navMarkup(activeModule) {
    return NAV_GROUPS.map((group) => `
      <section class="nm-nav-section">
        <p class="nm-nav-label">${group.label}</p>
        <div class="nm-nav-list">
          ${group.items.map(([key, glyph, label, href, permission]) => `
            <a class="nm-nav-link${key === activeModule ? ' is-active' : ''}" href="${href}"${permission ? ` data-permission="${permission}" hidden` : ''}${key === activeModule ? ' aria-current="page"' : ''}>
              <span class="nm-nav-icon">${glyph}</span>
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
        <div class="nm-brand-mark">NM</div>
        <div class="nm-brand-copy"><strong>NM Calçados</strong><span>Gestão comercial</span></div>
      </div>
      <nav class="nm-nav" aria-label="Navegação principal">${navMarkup(activeModule)}</nav>
      <footer class="nm-sidebar-footer">
        <div class="nm-sidebar-user">
          <span class="nm-avatar" id="shell-avatar">NM</span>
          <div><strong id="shell-user-name">Usuário</strong><span id="shell-user-role">Validando sessão...</span></div>
        </div>
        <button id="shell-logout" class="nm-logout-button" type="button">Encerrar sessão</button>
      </footer>`;
    return sidebar;
  }

  function buildTopbar(meta) {
    const topbar = document.createElement('header');
    topbar.className = 'app-topbar nm-app-topbar';
    topbar.innerHTML = `
      <div class="nm-topbar-left">
        <button id="nav-toggle" class="nm-nav-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">☰</button>
        <div class="nm-topbar-context"><span>${meta[2]}</span><strong>${meta[0]}</strong></div>
      </div>
      <div class="nm-topbar-actions">
        <a class="nm-topbar-catalog" href="/catalog/">Catálogo</a>
        <span class="nm-system-status"><i></i>Sistema disponível</span>
      </div>`;
    return topbar;
  }

  function ensureShell(activeModule, meta) {
    document.body.classList.add('admin-body', 'nm-admin-shell');
    document.body.dataset.module = activeModule;

    let frame = document.querySelector('.app-frame');
    let sidebar = document.getElementById('app-sidebar');
    let topbar = document.querySelector('.app-topbar');

    if (!frame) {
      const main = document.querySelector('main.admin-shell');
      if (!main) return null;

      frame = document.createElement('div');
      frame.className = 'app-frame nm-app-frame';
      sidebar = buildSidebar(activeModule);

      const appMain = document.createElement('div');
      appMain.className = 'app-main nm-app-main';
      topbar = buildTopbar(meta);

      main.parentNode.insertBefore(frame, main);
      frame.append(sidebar, appMain);
      appMain.append(topbar, main);

      const backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.id = 'nav-backdrop';
      backdrop.className = 'nm-nav-backdrop';
      backdrop.setAttribute('aria-label', 'Fechar menu');
      document.body.appendChild(backdrop);
    } else {
      sidebar?.classList.add('nm-app-sidebar');
      topbar?.classList.add('nm-app-topbar');
    }

    const header = document.querySelector('main.admin-shell > .admin-header');
    if (header) {
      header.classList.add('nm-page-header');
      const eyebrow = header.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = meta[2];
      const subtitle = header.querySelector('.muted');
      if (subtitle && !subtitle.textContent.trim()) subtitle.textContent = meta[1];
      header.querySelectorAll('a[href="/"]').forEach((link) => link.classList.add('nm-home-link'));
    }

    return { frame, sidebar, topbar };
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
    document.querySelectorAll('[data-permission]').forEach((link) => {
      link.hidden = !permissions.includes(link.dataset.permission);
    });
  }

  function initials(name) {
    return String(name || 'NM').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NM';
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
    sidebar?.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
  }

  const moduleName = currentModule();
  const meta = PAGE_META[moduleName];
  ensureShell(moduleName, meta);
  bindNavigation();

  const logout = document.getElementById('shell-logout');
  logout?.addEventListener('click', async () => {
    logout.disabled = true;
    try { await request('/api/auth/logout', { method: 'POST' }); }
    finally { location.assign('/'); }
  });

  request('/api/auth/me')
    .then((data) => {
      const user = data.user || {};
      const roles = (user.roles || []).map((role) => role.name).join(' + ') || 'Sessão ativa';
      const name = user.name || user.username || 'Usuário';
      const nameEl = document.getElementById('shell-user-name');
      const roleEl = document.getElementById('shell-user-role');
      const avatarEl = document.getElementById('shell-avatar');
      if (nameEl) nameEl.textContent = name;
      if (roleEl) roleEl.textContent = roles;
      if (avatarEl) avatarEl.textContent = initials(name);
      applyPermissions(data.permissions || []);
    })
    .catch(() => location.replace('/'));
})();
