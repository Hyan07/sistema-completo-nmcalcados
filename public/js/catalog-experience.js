'use strict';

(() => {
  const hero = document.querySelector('.catalog-hero > div');
  if (hero && !hero.querySelector('.catalog-journey')) {
    const journey = document.createElement('div');
    journey.className = 'catalog-journey';
    journey.setAttribute('aria-label', 'Como comprar pelo catálogo');
    journey.innerHTML = '<span><b>1</b> Encontre o produto</span><span><b>2</b> Escolha cor e tamanho</span><span><b>3</b> Envie o pedido</span>';
    hero.appendChild(journey);
  }

  const layout = document.querySelector('.catalog-layout');
  const filters = layout?.querySelector('.filters');
  if (layout && filters && !layout.querySelector('.catalog-filter-toggle')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-filter-toggle';
    button.textContent = 'Filtros e pesquisa';
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const open = layout.classList.toggle('filters-open');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Ocultar filtros' : 'Filtros e pesquisa';
    });
    layout.insertBefore(button, filters);
  }
})();
