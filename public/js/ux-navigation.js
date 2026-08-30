'use strict';

(() => {
  if (window.__NM_UX_NAVIGATION__) return;
  window.__NM_UX_NAVIGATION__ = true;

  const FLOWS = {
    dashboard: { title: 'Leia o negócio antes de agir', description: 'Use os indicadores para identificar desvios e entre no módulo responsável somente quando houver algo a tratar.', steps: ['Escolha o período', 'Leia os indicadores', 'Confira alertas', 'Abra o módulo relacionado'], related: ['reports', 'stock', 'finance'] },
    pos: { title: 'Fluxo seguro de uma venda', description: 'Venda e recebimento continuam separados: primeiro monte e finalize a venda; depois registre como ela foi recebida.', steps: ['Cliente e itens', 'Revise valores', 'Finalize a venda', 'Registre o pagamento'], related: ['cash', 'customers', 'catalog-orders'] },
    cash: { title: 'Operação do caixa em ordem', description: 'Abra uma sessão antes de receber numerário, registre movimentações durante o turno e confira antes de fechar.', steps: ['Abra o caixa', 'Movimente', 'Confira o esperado', 'Feche a sessão'], related: ['pos', 'finance'] },
    'catalog-orders': { title: 'Do pedido online para a venda real', description: 'O pedido do catálogo é uma intenção. Confirme itens e disponibilidade antes de converter qualquer pedido em venda.', steps: ['Receba o pedido', 'Valide estoque', 'Confirme com o cliente', 'Converta em venda'], related: ['pos', 'stock', 'customers'] },
    products: { title: 'Cadastre o produto antes da grade', description: 'Categoria, marca e dados comerciais formam o produto. Cor, tamanho e SKU são tratados depois na Grade.', steps: ['Organize categoria/marca', 'Cadastre o produto', 'Inclua imagens', 'Monte a grade'], related: ['grade', 'stock', 'catalog'] },
    grade: { title: 'Transforme produto em SKU vendável', description: 'A grade representa as combinações reais de cor e tamanho. Cada combinação deve ser conferida antes de receber estoque.', steps: ['Selecione o produto', 'Defina cores/tamanhos', 'Gere ou revise SKUs', 'Valide preços e status'], related: ['products', 'stock'] },
    stock: { title: 'Estoque físico com rastreabilidade', description: 'Consulte o saldo antes de movimentar e use ajustes somente quando houver motivo real e documentado.', steps: ['Localize o SKU', 'Confira o saldo', 'Registre a movimentação', 'Revise o histórico'], related: ['products', 'grade', 'purchases'] },
    customers: { title: 'Cadastro simples, histórico preservado', description: 'Pesquise antes de criar um novo cliente para evitar duplicidades e manter o histórico comercial concentrado.', steps: ['Pesquise o cliente', 'Cadastre ou edite', 'Revise contatos', 'Consulte o histórico'], related: ['pos', 'catalog-orders'] },
    suppliers: { title: 'Fornecedor único para todo o ciclo de compra', description: 'Mantenha os dados do fornecedor consistentes para que compras, recebimentos e financeiro permaneçam vinculados.', steps: ['Pesquise', 'Cadastre ou edite', 'Valide dados', 'Use em compras'], related: ['purchases', 'finance'] },
    purchases: { title: 'Compra, recebimento e financeiro em etapas', description: 'Criar a compra não aumenta estoque. O saldo físico muda no recebimento e a obrigação financeira nasce na etapa financeira.', steps: ['Crie a compra', 'Informe os itens', 'Receba fisicamente', 'Financeirize parcelas'], related: ['suppliers', 'stock', 'finance'] },
    finance: { title: 'Separe obrigação de liquidação', description: 'Acompanhe o que existe a receber ou pagar e registre a liquidação somente quando o dinheiro realmente entrar ou sair.', steps: ['Leia o resumo', 'Trate vencimentos', 'Registre liquidações', 'Confira o fluxo'], related: ['cash', 'purchases', 'reports'] },
    reports: { title: 'Filtre antes de exportar', description: 'Defina exatamente o recorte necessário, confira os dados na tela e só então gere o arquivo final.', steps: ['Escolha o relatório', 'Defina filtros', 'Confira resultados', 'Exporte'], related: ['dashboard', 'finance', 'stock'] },
    imports: { title: 'Importação em quatro barreiras', description: 'Nunca aplique um arquivo diretamente: selecione o tipo, valide, simule e somente depois confirme a gravação.', steps: ['Escolha o tipo', 'Envie o arquivo', 'Valide/simule', 'Confirme a aplicação'], related: ['products', 'customers', 'suppliers'] },
    users: { title: 'Acesso mínimo necessário', description: 'Cadastre o usuário, associe funções e permissões somente de acordo com a atividade que ele realmente executa.', steps: ['Cadastre o usuário', 'Associe funções', 'Revise permissões', 'Valide o acesso'], related: ['dashboard'] }
  };

  const SECTION_TYPES = [
    { test: /resumo|indicador|vis[aã]o|totais|saldo/i, label: 'Resumo', className: 'summary' },
    { test: /novo|nova|cadastr|adicionar|criar|abrir/i, label: 'Cadastro / ação', className: 'create' },
    { test: /hist[oó]rico|recent|movimentos|liquida[cç][oõ]es|vendas|contas|pedidos/i, label: 'Consulta / histórico', className: 'history' },
    { test: /estoque|grade|produto|cliente|fornecedor|compra|caixa|finance/i, label: 'Operação', className: 'operation' }
  ];

  function moduleName() {
    const bodyModule = document.body.dataset.module;
    if (bodyModule) return bodyModule;
    return location.pathname.split('/').pop()?.replace(/\.html$/i, '') || 'dashboard';
  }

  function slug(value) {
    return String(value || 'secao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'secao';
  }

  function visible(element) {
    if (!element || element.closest('[hidden]')) return false;
    return getComputedStyle(element).display !== 'none';
  }

  function classify(title) {
    return SECTION_TYPES.find((item) => item.test.test(title)) || { label: 'Área de trabalho', className: 'work' };
  }

  function majorCards(main) {
    return [...main.querySelectorAll('.admin-card')].filter((card) => {
      if (card.closest('dialog') || !card.querySelector('h2')) return false;
      return !card.parentElement?.closest('.admin-card');
    });
  }

  function decorateSections(main) {
    const usedIds = new Set();
    return majorCards(main).map((card, index) => {
      const heading = card.querySelector('h2');
      const title = heading.textContent.trim();
      const type = classify(title);
      let id = `secao-${slug(title)}`;
      let suffix = 2;
      while (usedIds.has(id) || document.getElementById(id)) id = `secao-${slug(title)}-${suffix++}`;
      usedIds.add(id);
      card.id = card.id || id;
      card.classList.add('nm-ux-section');
      card.dataset.sectionType = type.className;

      const headingContainer = heading.parentElement;
      if (headingContainer && !headingContainer.querySelector(':scope > .nm-section-kicker')) {
        const kicker = document.createElement('span');
        kicker.className = 'nm-section-kicker';
        kicker.textContent = `${String(index + 1).padStart(2, '0')} · ${type.label}`;
        headingContainer.insertBefore(kicker, heading);
      }
      card.querySelectorAll(':scope > form, :scope > .section-heading + form').forEach((form) => form.classList.add('nm-ux-form-zone'));
      card.querySelectorAll('h3').forEach((h3) => h3.classList.add('nm-subsection-title'));
      return { id: card.id, title, card };
    });
  }

  function makeWorkflow(flow) {
    const guide = document.createElement('section');
    guide.className = 'nm-workflow-guide';
    guide.setAttribute('aria-label', 'Fluxo recomendado desta página');
    guide.innerHTML = `<div class="nm-workflow-intro"><span class="nm-workflow-label">Como usar esta tela</span><strong>${flow.title}</strong><p>${flow.description}</p></div><div class="nm-workflow-steps">${flow.steps.map((step, index) => `<div class="nm-workflow-step"><span>${index + 1}</span><small>${step}</small></div>`).join('')}</div><div class="nm-related-links" aria-label="Módulos relacionados"></div>`;
    return guide;
  }

  function relatedLinks(container, related) {
    if (!container || !related?.length) return;
    const render = () => {
      const links = related.map((key) => {
        const selector = key === 'catalog' ? '.nm-nav-link[href="/catalog/"], .app-nav-link[href="/catalog/"]' : `.nm-nav-link[href$="/${key}.html"], .app-nav-link[href$="/${key}.html"]`;
        const nav = document.querySelector(selector);
        if (!nav || nav.hidden) return null;
        return `<a href="${nav.getAttribute('href')}">${nav.textContent.trim()}<span aria-hidden="true">→</span></a>`;
      }).filter(Boolean);
      container.innerHTML = links.length ? `<span>Atalhos relacionados</span>${links.join('')}` : '';
    };
    render();
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) new MutationObserver(render).observe(sidebar, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
  }

  function makeSectionNav(sections) {
    if (sections.length < 2) return null;
    const nav = document.createElement('nav');
    nav.className = 'nm-section-nav';
    nav.setAttribute('aria-label', 'Seções desta página');
    nav.innerHTML = `<span class="nm-section-nav-label">Nesta página</span><div>${sections.map((section, index) => `<a href="#${section.id}"${index === 0 ? ' class="is-active"' : ''}>${section.title}</a>`).join('')}</div>`;
    return nav;
  }

  function bindSectionNav(nav, sections) {
    if (!nav) return;
    const links = [...nav.querySelectorAll('a')];
    const syncVisibility = () => {
      links.forEach((link) => {
        const target = document.querySelector(link.getAttribute('href'));
        const shouldHide = !visible(target);
        if (link.hidden !== shouldHide) link.hidden = shouldHide;
      });
      if (!links.some((link) => !link.hidden && link.classList.contains('is-active'))) {
        links.forEach((link) => link.classList.remove('is-active'));
        links.find((link) => !link.hidden)?.classList.add('is-active');
      }
    };
    syncVisibility();

    links.forEach((link) => link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', link.getAttribute('href'));
    }));

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const shown = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!shown.length) return;
        const id = shown[0].target.id;
        links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
      }, { rootMargin: '-145px 0px -60% 0px', threshold: [0.05, 0.2, 0.5] });
      sections.forEach((section) => observer.observe(section.card));
    }

    const main = nav.closest('main');
    if (main) new MutationObserver(syncVisibility).observe(main, { attributes: true, subtree: true, attributeFilter: ['hidden', 'style'] });
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
    document.querySelectorAll('button, .secondary-link').forEach((button) => {
      if (/cancelar venda|excluir|desativar|estornar|encerrar sess[aã]o/i.test(button.textContent.trim())) button.classList.add('nm-danger-action');
    });
  }

  const main = document.querySelector('main.admin-shell, main.dashboard-shell');
  if (!main) return;
  const flow = FLOWS[moduleName()] || { title: 'Trabalhe por etapas', description: 'Use a navegação local para encontrar rapidamente a área necessária e conclua uma ação de cada vez.', steps: ['Localize a área', 'Preencha os dados', 'Revise', 'Confirme'], related: [] };
  const header = main.querySelector(':scope > .admin-header, :scope > .dashboard-page-header');
  const sections = decorateSections(main);
  const workflow = makeWorkflow(flow);
  const localNav = makeSectionNav(sections);

  if (header) {
    header.insertAdjacentElement('afterend', workflow);
    if (localNav) workflow.insertAdjacentElement('afterend', localNav);
  } else {
    main.prepend(workflow);
    if (localNav) workflow.insertAdjacentElement('afterend', localNav);
  }

  relatedLinks(workflow.querySelector('.nm-related-links'), flow.related);
  bindSectionNav(localNav, sections);
  enhanceFeedback();
  markDangerActions();
  document.body.classList.add('nm-ux-ready');
})();
