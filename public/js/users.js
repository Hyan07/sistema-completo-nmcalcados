'use strict';

const body = document.getElementById('users-body');
const feedback = document.getElementById('feedback');
const createCard = document.getElementById('create-card');
const createForm = document.getElementById('create-user-form');
const refreshButton = document.getElementById('refresh-button');
const passwordDialog = document.getElementById('password-dialog');
const passwordResetForm = document.getElementById('password-reset-form');
const resetPasswordInput = document.getElementById('reset-password');
let permissions = [];
let roles = [];
let permissionCatalog = [];
let resetUserId = null;

const PERMISSION_GROUP_LABELS = {
  dashboard: 'Dashboard', sales: 'Vendas', cash: 'Caixa', catalog: 'Catálogo', products: 'Produtos', stock: 'Estoque',
  customers: 'Clientes', suppliers: 'Fornecedores', purchases: 'Compras', finance: 'Financeiro', reports: 'Relatórios',
  imports: 'Importações', users: 'Usuários', roles: 'Cargos', permissions: 'Permissões', audit: 'Auditoria'
};

function can(code) { return permissions.includes(code); }
function setFeedback(message, error = false) { feedback.textContent = message; feedback.classList.toggle('is-error', error); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '\"':'&quot;' }[char])); }
function selectedValues(select) { return [...select.selectedOptions].map((option) => option.value); }
async function api(url, options = {}) {
  const response = await fetch(url, { credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Operação não concluída.');
  return data;
}
function roleOptions(selectedIds = []) {
  const selected = new Set(selectedIds.map(String));
  return roles.filter((role) => role.is_active || selected.has(String(role.id))).map((role) => `<option value="${escapeHtml(role.id)}" ${selected.has(String(role.id)) ? 'selected' : ''}>${escapeHtml(role.name)}</option>`).join('');
}
function permissionOptions(selectedIds = []) {
  const selected = new Set(selectedIds.map(String));
  const groups = new Map();
  for (const permission of permissionCatalog) {
    const prefix = String(permission.code || '').split('.')[0] || 'other';
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(permission);
  }
  return [...groups.entries()].sort(([a],[b]) => (PERMISSION_GROUP_LABELS[a] || a).localeCompare(PERMISSION_GROUP_LABELS[b] || b, 'pt-BR')).map(([prefix, items]) => `<optgroup label="${escapeHtml(PERMISSION_GROUP_LABELS[prefix] || prefix)}">${items.map((permission) => `<option value="${escapeHtml(permission.id)}" ${selected.has(String(permission.id)) ? 'selected' : ''}>${escapeHtml(permission.code)}</option>`).join('')}</optgroup>`).join('');
}
function renderUsers(users) {
  body.innerHTML = users.map((user) => {
    const editable = can('users.update');
    const roleIds = (user.roles || []).map((role) => role.id);
    const permissionIds = (user.direct_permissions || []).map((permission) => permission.id);
    return `<tr data-user-id="${escapeHtml(user.id)}"><td><input class="table-input name" value="${escapeHtml(user.name)}" ${editable ? '' : 'disabled'}></td><td><input class="table-input username" value="${escapeHtml(user.username)}" ${editable ? '' : 'disabled'}></td><td><select class="table-input roles" multiple size="5" ${editable ? '' : 'disabled'}>${roleOptions(roleIds)}</select></td><td><select class="table-input direct-permissions" multiple size="6" ${editable ? '' : 'disabled'}>${permissionOptions(permissionIds)}</select></td><td><select class="table-input status" ${editable ? '' : 'disabled'}><option value="true" ${user.is_active ? 'selected' : ''}>Ativo</option><option value="false" ${user.is_active ? '' : 'selected'}>Inativo</option></select></td><td class="actions">${editable ? '<button class="secondary-button save" type="button">Salvar</button><button class="text-button reset" type="button">Redefinir senha</button>' : '—'}</td></tr>`;
  }).join('');
}
async function load() {
  try {
    const session = await api('/api/auth/me');
    permissions = session.permissions;
    if (!can('users.read')) throw new Error('Você não possui permissão para consultar usuários.');
    const requests = [api('/api/users/meta/roles'), api('/api/users')];
    if (can('permissions.read')) requests.push(api('/api/users/meta/permissions'));
    const [roleResponse, usersResponse, permissionResponse] = await Promise.all(requests);
    roles = roleResponse.data;
    permissionCatalog = permissionResponse?.data || [];
    renderUsers(usersResponse.data);
    if (can('users.create')) {
      createCard.hidden = false;
      createForm.roleIds.innerHTML = roleOptions();
      createForm.permissionIds.innerHTML = permissionOptions();
    }
    window.NMUI?.enhance(document.querySelector('.users-table-wrap'));
    setFeedback('Dados atualizados.');
  } catch (error) { setFeedback(error.message, true); }
}
createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/users', { method:'POST', body:JSON.stringify({
      name:createForm.name.value,
      username:createForm.username.value,
      email:createForm.email.value,
      roleIds:selectedValues(createForm.roleIds),
      permissionIds:selectedValues(createForm.permissionIds),
      password:createForm.password.value
    }) });
    createForm.reset();
    await load();
    setFeedback('Usuário criado com sucesso.');
  } catch (error) { setFeedback(error.message, true); }
});
body.addEventListener('click', async (event) => {
  const row = event.target.closest('tr[data-user-id]');
  if (!row) return;
  try {
    if (event.target.classList.contains('save')) {
      await api(`/api/users/${row.dataset.userId}`, { method:'PATCH', body:JSON.stringify({
        name:row.querySelector('.name').value,
        username:row.querySelector('.username').value,
        roleIds:selectedValues(row.querySelector('.roles')),
        permissionIds:selectedValues(row.querySelector('.direct-permissions')),
        isActive:row.querySelector('.status').value === 'true'
      }) });
      await load();
      setFeedback('Usuário, cargos e permissões atualizados.');
    }
    if (event.target.classList.contains('reset')) {
      resetUserId = row.dataset.userId;
      resetPasswordInput.value = '';
      passwordDialog.showModal();
      resetPasswordInput.focus();
    }
  } catch (error) { setFeedback(error.message, true); }
});
passwordResetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!resetUserId) return;
  try {
    await api(`/api/users/${resetUserId}/password`, { method:'PATCH', body:JSON.stringify({ password:resetPasswordInput.value }) });
    passwordDialog.close();
    resetUserId = null;
    setFeedback('Senha redefinida e sessões antigas invalidadas.');
  } catch (error) { setFeedback(error.message, true); }
});
document.getElementById('cancel-reset').addEventListener('click', () => { resetUserId = null; passwordDialog.close(); });
refreshButton.addEventListener('click', load);
load();
