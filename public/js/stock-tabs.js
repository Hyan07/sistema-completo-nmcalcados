'use strict';

const stockTabButtons = [...document.querySelectorAll('[data-stock-tab]')];
const stockPanels = [...document.querySelectorAll('[data-stock-panel]')];

function activateStockTab(name) {
  const selected = stockTabButtons.some((button) => button.dataset.stockTab === name) ? name : 'products';
  stockTabButtons.forEach((button) => {
    const active = button.dataset.stockTab === selected;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  stockPanels.forEach((panel) => { panel.hidden = panel.dataset.stockPanel !== selected; });
  const url = new URL(window.location.href);
  url.searchParams.set('tab', selected);
  history.replaceState(null, '', url);
}

stockTabButtons.forEach((button) => {
  button.addEventListener('click', () => activateStockTab(button.dataset.stockTab));
});

activateStockTab(new URLSearchParams(window.location.search).get('tab') || 'products');
