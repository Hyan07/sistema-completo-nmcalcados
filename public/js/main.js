'use strict';

const form = document.getElementById('login-form');
const panel = document.getElementById('session-panel');
const feedback = document.getElementById('feedback');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('toggle-password');

function setFeedback(message, isError = false) { feedback.textContent = message; feedback.classList.toggle('is-error', isError); }
function showSession(user, permissions = []) {
  form.hidden = true;
  panel.hidden = false;
  document.getElementById('session-user').textContent = user.name;
  document.getElementById('session-role').textContent = (user.roles || []).map((role) => role.name).join(' + ') || 'Sem cargo ativo';
  document.getElementById('products-link').hidden = !permissions.includes('products.read');
  document.getElementById('grade-link').hidden = !permissions.includes('products.read');
  document.getElementById('stock-link').hidden = !permissions.includes('stock.read');
  document.getElementById('customers-link').hidden = !permissions.includes('customers.read');
  document.getElementById('users-link').hidden = !permissions.includes('users.read');
}
function showLogin() { panel.hidden = true; form.hidden = false; }
async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Não foi possível concluir a operação.');
  return body;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault(); loginButton.disabled = true; setFeedback('Autenticando...');
  try {
    const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: form.username.value, password: form.password.value }) });
    form.reset(); showSession(data.user, data.permissions); setFeedback('Acesso autorizado.');
  } catch (error) { setFeedback(error.message, true); }
  finally { loginButton.disabled = false; }
});
logoutButton.addEventListener('click', async () => { try { await request('/api/auth/logout', { method: 'POST' }); } finally { showLogin(); setFeedback('Sessão encerrada.'); } });
togglePassword.addEventListener('click', () => { const visible = passwordInput.type === 'text'; passwordInput.type = visible ? 'password' : 'text'; togglePassword.textContent = visible ? 'Mostrar' : 'Ocultar'; });
request('/api/auth/me').then((data) => showSession(data.user, data.permissions)).catch(() => showLogin());
