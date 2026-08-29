'use strict';

async function verifyApi() {
  const statusText = document.getElementById('api-status');
  const statusRow = statusText?.closest('.status-row');

  if (!statusText || !statusRow) return;

  try {
    const response = await fetch('/api/health', {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    statusRow.dataset.status = data.status === 'ok' ? 'ok' : 'error';
    statusText.textContent = data.status === 'ok' ? 'API disponível' : 'API indisponível';
  } catch (error) {
    statusRow.dataset.status = 'error';
    statusText.textContent = 'API indisponível';
    console.error('Falha no health check:', error);
  }
}

verifyApi();
