'use strict';

const bcrypt = require('bcrypt');
const { env } = require('../config/env');
const { getPool } = require('../config/database');
const userRepository = require('../repositories/userRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeEmail, normalizeUsername, validateEmail, validateName, validatePassword, validateUsername } = require('../utils/authValidation');

async function listUsers() { return userRepository.listUsers(); }
async function listRoles() { return userRepository.listRoles(); }
async function listPermissions() { return userRepository.listPermissions(); }

function normalizeIds(value, fieldName, { required = false } = {}) {
  const source = value == null ? [] : (Array.isArray(value) ? value : [value]);
  const ids = [...new Set(source.map((item) => Number(item)))];
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new HttpError(400, `INVALID_${fieldName.toUpperCase()}`, `${fieldName} inválido.`);
  }
  if (required && ids.length === 0) throw new HttpError(400, `INVALID_${fieldName.toUpperCase()}`, `Informe ao menos um ${fieldName}.`);
  return ids;
}

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

async function validateRoles(roleIds, connection = null) {
  const roles = await userRepository.findRolesByIds(roleIds, connection);
  if (roles.length !== roleIds.length || roles.some((role) => !role.is_active)) {
    throw new HttpError(400, 'INVALID_ROLES', 'Um ou mais cargos são inválidos ou estão inativos.');
  }
  return roles;
}

async function validatePermissions(permissionIds, connection = null) {
  const permissions = await userRepository.findPermissionsByIds(permissionIds, connection);
  if (permissions.length !== permissionIds.length) throw new HttpError(400, 'INVALID_PERMISSIONS', 'Uma ou mais permissões são inválidas.');
  return permissions;
}

function extractRoleIds(input, { required = false } = {}) {
  if (hasOwn(input, 'roleIds')) return normalizeIds(input.roleIds, 'cargos', { required });
  if (hasOwn(input, 'roleId')) return normalizeIds(input.roleId, 'cargos', { required });
  if (required) return normalizeIds([], 'cargos', { required: true });
  return null;
}

async function createUser(input, actor) {
  const name = String(input.name || '').trim();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const roleIds = extractRoleIds(input, { required: true });
  const permissionIds = normalizeIds(input.permissionIds, 'permissoes');

  if (!validateName(name)) throw new HttpError(400, 'INVALID_NAME', 'Nome inválido.');
  if (!validateUsername(username)) throw new HttpError(400, 'INVALID_USERNAME', 'Usuário deve ter 3 a 80 caracteres e usar apenas letras minúsculas, números, ponto, hífen ou underline.');
  if (!validateEmail(email)) throw new HttpError(400, 'INVALID_EMAIL', 'E-mail inválido.');
  if (!validatePassword(input.password)) throw new HttpError(400, 'WEAK_PASSWORD', 'Senha deve ter entre 12 e 128 caracteres.');

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await validateRoles(roleIds, connection);
    await validatePermissions(permissionIds, connection);
    const [result] = await connection.execute(
      `INSERT INTO users (name, username, email, password_hash, password_changed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
      [name, username, email, passwordHash]
    );
    const userId = result.insertId;
    await userRepository.replaceUserRoles(userId, roleIds, actor.id, connection);
    await userRepository.replaceUserPermissions(userId, permissionIds, actor.id, connection);
    await createAuditLog({
      userId: actor.id,
      actionCode: 'USER_CREATED',
      entityType: 'USER',
      entityId: userId,
      newData: { name, username, email, roleIds, permissionIds, isActive: true }
    }, connection);
    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'USER_ALREADY_EXISTS', 'Já existe usuário com o username ou e-mail informado.');
    throw error;
  } finally {
    connection.release();
  }
}

async function updateUser(userId, input, actor) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_USER_ID', 'Usuário inválido.');

  const changes = {};
  if (hasOwn(input, 'name')) {
    changes.name = String(input.name || '').trim();
    if (!validateName(changes.name)) throw new HttpError(400, 'INVALID_NAME', 'Nome inválido.');
  }
  if (hasOwn(input, 'username')) {
    changes.username = normalizeUsername(input.username);
    if (!validateUsername(changes.username)) throw new HttpError(400, 'INVALID_USERNAME', 'Usuário inválido.');
  }
  if (hasOwn(input, 'email')) {
    changes.email = normalizeEmail(input.email);
    if (!validateEmail(changes.email)) throw new HttpError(400, 'INVALID_EMAIL', 'E-mail inválido.');
  }
  if (hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new HttpError(400, 'INVALID_STATUS', 'Status do usuário inválido.');
    changes.isActive = input.isActive;
  }

  const roleIds = extractRoleIds(input);
  const permissionIds = hasOwn(input, 'permissionIds') ? normalizeIds(input.permissionIds, 'permissoes') : null;
  if (Object.keys(changes).length === 0 && roleIds === null && permissionIds === null) {
    throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await userRepository.findUserForUpdate(id, connection);
    if (!current) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');

    const currentRoleIds = await userRepository.getUserRoleIds(id, connection);
    const currentPermissionIds = await userRepository.getUserPermissionIds(id, connection);
    const currentRoles = await userRepository.findRolesByIds(currentRoleIds, connection);
    const nextRoleIds = roleIds === null ? currentRoleIds : roleIds;
    const nextPermissionIds = permissionIds === null ? currentPermissionIds : permissionIds;
    const nextRoles = roleIds === null ? currentRoles : await validateRoles(nextRoleIds, connection);
    if (nextRoleIds.length === 0) throw new HttpError(400, 'INVALID_ROLES', 'O usuário deve possuir ao menos um cargo.');
    if (permissionIds !== null) await validatePermissions(nextPermissionIds, connection);

    const currentHasAdmin = currentRoles.some((role) => role.code === 'ADMINISTRADOR' && role.is_active);
    const nextHasAdmin = nextRoles.some((role) => role.code === 'ADMINISTRADOR' && role.is_active);
    const removesAdmin = currentHasAdmin && (changes.isActive === false || !nextHasAdmin);
    if (removesAdmin && await userRepository.countActiveAdministratorsForUpdate(connection) <= 1) {
      throw new HttpError(409, 'LAST_ADMIN_REQUIRED', 'Não é permitido remover ou desativar o último administrador ativo.');
    }
    if (Number(actor.id) === id && changes.isActive === false) {
      throw new HttpError(409, 'CANNOT_DISABLE_SELF', 'O usuário autenticado não pode desativar a própria conta.');
    }

    await userRepository.updateUser(id, changes, connection);
    if (roleIds !== null) await userRepository.replaceUserRoles(id, nextRoleIds, actor.id, connection);
    if (permissionIds !== null) await userRepository.replaceUserPermissions(id, nextPermissionIds, actor.id, connection);

    const accessChanged = roleIds !== null || permissionIds !== null || hasOwn(changes, 'isActive');
    if (accessChanged) await userRepository.incrementAuthVersion(id, connection);

    await createAuditLog({
      userId: actor.id,
      actionCode: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      previousData: {
        name: current.name,
        username: current.username,
        email: current.email,
        roleIds: currentRoleIds,
        permissionIds: currentPermissionIds,
        isActive: Boolean(current.is_active)
      },
      newData: { ...changes, ...(roleIds !== null ? { roleIds: nextRoleIds } : {}), ...(permissionIds !== null ? { permissionIds: nextPermissionIds } : {}) }
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'USER_ALREADY_EXISTS', 'Já existe usuário com o username ou e-mail informado.');
    throw error;
  } finally {
    connection.release();
  }
}

async function resetPassword(userId, input, actor) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_USER_ID', 'Usuário inválido.');
  if (!validatePassword(input.password)) throw new HttpError(400, 'WEAK_PASSWORD', 'Senha deve ter entre 12 e 128 caracteres.');
  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await userRepository.findUserForUpdate(id, connection);
    if (!current) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    await connection.execute(
      `UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP(3), auth_version = auth_version + 1,
       failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [passwordHash, id]
    );
    await createAuditLog({ userId: actor.id, actionCode: 'USER_PASSWORD_RESET', entityType: 'USER', entityId: id }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createUser, listPermissions, listRoles, listUsers, resetPassword, updateUser };
