'use strict';

const sidebar = document.getElementById('app-sidebar');
const navToggle = document.getElementById('nav-toggle');
const navBackdrop = document.getElementById('nav-backdrop');
const logoutButton = document.getElementById('shell-logout');
const userName = document.getElementById('shell-user-name');
const userRole = document.getElementById('shell-user-role');

async function shellRequest(url, options = {}) {
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

function applyPermissions(permissions = []) {
  document.querySelectorAll('[data-permission]').forEach((element) => {
    element.hidden = !permissions.includes(element.dataset.permission);
  });
}

function closeNavigation() {
  document.body.classList.remove('nav-open');
  navToggle?.setAttribute('aria-expanded', 'false');
}

navToggle?.addEventListener('click', () => {
  const open = !document.body.classList.contains('nav-open');
  document.body.classList.toggle('nav-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});
navBackdrop?.addEventListener('click', closeNavigation);
sidebar?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeNavigation();
});

logoutButton?.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await shellRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.assign('/');
  }
});

shellRequest('/api/auth/me')
  .then((data) => {
    const user = data.user || {};
    const roles = (user.roles || []).map((role) => role.name).join(' + ');
    if (userName) userName.textContent = user.name || user.username || 'Usuário';
    if (userRole) userRole.textContent = roles || 'Sessão ativa';
    applyPermissions(data.permissions || []);
  })
  .catch(() => {
    window.location.replace('/');
  });
