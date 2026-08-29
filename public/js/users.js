'use strict';

const body = document.getElementById('users-body');
const feedback = document.getElementById('feedback');
const createCard = document.getElementById('create-card');
const createForm = document.getElementById('create-user-form');
const refreshButton = document.getElementById('refresh-button');
const passwordDialog = document.getElementById('password-dialog');
const passwordResetForm = document.getElementById('password-reset-form');
const resetPasswordInput = document.getElementById('reset-password');
let permissions = []; let roles = []; let resetUserId = null;
function can(code) { return permissions.includes(code); }
function setFeedback(message, error = false) { feedback.textContent = message; feedback.classList.toggle('is-error', error); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Operação não concluída.');
  return data;
}
function roleOptions(selected) { return roles.filter((role) => role.is_active).map((role) => `<option value="${escapeHtml(role.id)}" ${String(role.id) === String(selected) ? 'selected' : ''}>${escapeHtml(role.name)}</option>`).join(''); }
function renderUsers(users) {
  body.innerHTML = users.map((user) => {
    const editable = can('users.update');
    return `<tr data-user-id="${escapeHtml(user.id)}"><td><input class="table-input name" value="${escapeHtml(user.name)}" ${editable ? '' : 'disabled'}></td><td><input class="table-input username" value="${escapeHtml(user.username)}" ${editable ? '' : 'disabled'}></td><td><select class="table-input role" ${editable ? '' : 'disabled'}>${roleOptions(user.role_id)}</select></td><td><select class="table-input status" ${editable ? '' : 'disabled'}><option value="true" ${user.is_active ? 'selected' : ''}>Ativo</option><option value="false" ${user.is_active ? '' : 'selected'}>Inativo</option></select></td><td class="actions">${editable ? '<button class="secondary-button save" type="button">Salvar</button><button class="text-button reset" type="button">Redefinir senha</button>' : '—'}</td></tr>`;
  }).join('');
}
async function load() {
  try {
    const session = await api('/api/auth/me'); permissions = session.permissions;
    if (!can('users.read')) throw new Error('Você não possui permissão para consultar usuários.');
    const [roleResponse, usersResponse] = await Promise.all([api('/api/users/meta/roles'), api('/api/users')]);
    roles = roleResponse.data; renderUsers(usersResponse.data);
    if (can('users.create')) { createCard.hidden = false; createForm.roleId.innerHTML = roleOptions(); }
    setFeedback('Dados atualizados.');
  } catch (error) { setFeedback(error.message, true); }
}
createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/users', { method: 'POST', body: JSON.stringify({ name: createForm.name.value, username: createForm.username.value, email: createForm.email.value, roleId: createForm.roleId.value, password: createForm.password.value }) });
    createForm.reset(); await load(); setFeedback('Usuário criado com sucesso.');
  } catch (error) { setFeedback(error.message, true); }
});
body.addEventListener('click', async (event) => {
  const row = event.target.closest('tr[data-user-id]'); if (!row) return;
  try {
    if (event.target.classList.contains('save')) {
      await api(`/api/users/${row.dataset.userId}`, { method: 'PATCH', body: JSON.stringify({ name: row.querySelector('.name').value, username: row.querySelector('.username').value, roleId: row.querySelector('.role').value, isActive: row.querySelector('.status').value === 'true' }) });
      setFeedback('Usuário atualizado.');
    }
    if (event.target.classList.contains('reset')) { resetUserId = row.dataset.userId; resetPasswordInput.value = ''; passwordDialog.showModal(); resetPasswordInput.focus(); }
  } catch (error) { setFeedback(error.message, true); }
});
passwordResetForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!resetUserId) return;
  try { await api(`/api/users/${resetUserId}/password`, { method: 'PATCH', body: JSON.stringify({ password: resetPasswordInput.value }) }); passwordDialog.close(); resetUserId = null; setFeedback('Senha redefinida e sessões antigas invalidadas.'); }
  catch (error) { setFeedback(error.message, true); }
});
document.getElementById('cancel-reset').addEventListener('click', () => { resetUserId = null; passwordDialog.close(); });
refreshButton.addEventListener('click', load); load();
