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

async function createUser(input, actor) {
  const name = String(input.name || '').trim();
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const roleId = Number(input.roleId);
  if (!validateName(name)) throw new HttpError(400, 'INVALID_NAME', 'Nome inválido.');
  if (!validateUsername(username)) throw new HttpError(400, 'INVALID_USERNAME', 'Usuário deve ter 3 a 80 caracteres e usar apenas letras minúsculas, números, ponto, hífen ou underline.');
  if (!validateEmail(email)) throw new HttpError(400, 'INVALID_EMAIL', 'E-mail inválido.');
  if (!validatePassword(input.password)) throw new HttpError(400, 'WEAK_PASSWORD', 'Senha deve ter entre 12 e 128 caracteres.');
  if (!Number.isSafeInteger(roleId) || roleId < 1) throw new HttpError(400, 'INVALID_ROLE', 'Perfil inválido.');
  const role = await userRepository.findRoleById(roleId);
  if (!role || !role.is_active) throw new HttpError(400, 'INVALID_ROLE', 'Perfil inválido ou inativo.');

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO users (role_id, name, username, email, password_hash, password_changed_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`, [roleId, name, username, email, passwordHash]
    );
    const userId = result.insertId;
    await createAuditLog({ userId: actor.id, actionCode: 'USER_CREATED', entityType: 'USER', entityId: userId, newData: { name, username, email, roleId: String(roleId), isActive: true } }, connection);
    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'USER_ALREADY_EXISTS', 'Já existe usuário com o username ou e-mail informado.');
    throw error;
  } finally { connection.release(); }
}

async function updateUser(userId, input, actor) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_USER_ID', 'Usuário inválido.');
  const changes = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    changes.name = String(input.name || '').trim();
    if (!validateName(changes.name)) throw new HttpError(400, 'INVALID_NAME', 'Nome inválido.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'username')) {
    changes.username = normalizeUsername(input.username);
    if (!validateUsername(changes.username)) throw new HttpError(400, 'INVALID_USERNAME', 'Usuário inválido.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'email')) {
    changes.email = normalizeEmail(input.email);
    if (!validateEmail(changes.email)) throw new HttpError(400, 'INVALID_EMAIL', 'E-mail inválido.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'roleId')) {
    changes.roleId = Number(input.roleId);
    if (!Number.isSafeInteger(changes.roleId) || changes.roleId < 1) throw new HttpError(400, 'INVALID_ROLE', 'Perfil inválido.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new HttpError(400, 'INVALID_STATUS', 'Status do usuário inválido.');
    changes.isActive = input.isActive;
  }
  if (Object.keys(changes).length === 0) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await userRepository.findUserForUpdate(id, connection);
    if (!current) throw new HttpError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    if (changes.roleId !== undefined) {
      const role = await userRepository.findRoleById(changes.roleId, connection);
      if (!role || !role.is_active) throw new HttpError(400, 'INVALID_ROLE', 'Perfil inválido ou inativo.');
    }
    const removesAdmin = current.role_code === 'ADMINISTRADOR' && (changes.isActive === false || (changes.roleId !== undefined && Number(changes.roleId) !== Number(current.role_id)));
    if (removesAdmin && await userRepository.countActiveAdministrators(connection) <= 1) throw new HttpError(409, 'LAST_ADMIN_REQUIRED', 'Não é permitido remover ou desativar o último administrador ativo.');
    if (Number(actor.id) === id && changes.isActive === false) throw new HttpError(409, 'CANNOT_DISABLE_SELF', 'O usuário autenticado não pode desativar a própria conta.');

    await userRepository.updateUser(id, changes, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'USER_UPDATED', entityType: 'USER', entityId: id,
      previousData: { name: current.name, username: current.username, email: current.email, roleId: String(current.role_id || ''), isActive: Boolean(current.is_active) },
      newData: changes
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'USER_ALREADY_EXISTS', 'Já existe usuário com o username ou e-mail informado.');
    throw error;
  } finally { connection.release(); }
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
       failed_login_attempts = 0, locked_until = NULL WHERE id = ?`, [passwordHash, id]
    );
    await createAuditLog({ userId: actor.id, actionCode: 'USER_PASSWORD_RESET', entityType: 'USER', entityId: id }, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { createUser, listPermissions, listRoles, listUsers, resetPassword, updateUser };
