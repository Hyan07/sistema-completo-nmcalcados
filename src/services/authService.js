'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { env } = require('../config/env');
const authRepository = require('../repositories/authRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeUsername, validatePassword, validateUsername } = require('../utils/authValidation');

const DUMMY_HASH_PROMISE = bcrypt.hash('nm-invalid-login-placeholder', env.bcryptRounds);
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function publicUser(user, roles = []) {
  return {
    id: String(user.id),
    name: user.name,
    username: user.username,
    email: user.email,
    roles: roles.map((role) => ({ id: String(role.id), code: role.code, name: role.name }))
  };
}

function auditIdentifier(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function sanitizeMetadata(metadata = {}) {
  return { ipHash: auditIdentifier(metadata.ip), userAgent: String(metadata.userAgent || '').slice(0, 500) };
}

async function login({ username, password, metadata }) {
  const normalizedUsername = normalizeUsername(username);
  if (!validateUsername(normalizedUsername) || typeof password !== 'string' || password.length > 128) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.');
  }

  const user = await authRepository.findUserByUsername(normalizedUsername);
  const hash = user?.password_hash || await DUMMY_HASH_PROMISE;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    if (user) {
      const nextAttempts = Number(user.failed_login_attempts) + 1;
      const lockedUntil = nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;
      await authRepository.recordFailedLogin(user.id, lockedUntil);
    }
    await createAuditLog({
      userId: user?.id || null,
      actionCode: 'AUTH_LOGIN_FAILED',
      entityType: 'AUTH',
      metadata: { ...sanitizeMetadata(metadata), identifierHash: auditIdentifier(normalizedUsername) }
    });
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.');
  }

  if (!user.is_active) throw new HttpError(403, 'USER_INACTIVE', 'Acesso não autorizado para este usuário.');
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    throw new HttpError(429, 'USER_TEMPORARILY_LOCKED', 'Muitas tentativas inválidas. Tente novamente mais tarde.');
  }

  const roles = await authRepository.getActiveRolesByUserId(user.id);
  if (roles.length === 0) throw new HttpError(403, 'USER_WITHOUT_ACTIVE_ROLE', 'Acesso não autorizado para este usuário.');

  await authRepository.recordSuccessfulLogin(user.id);
  const permissions = await authRepository.getPermissionsByUserId(user.id);
  await createAuditLog({ userId: user.id, actionCode: 'AUTH_LOGIN_SUCCESS', entityType: 'USER', entityId: user.id, metadata: sanitizeMetadata(metadata) });
  return { user: publicUser(user, roles), authVersion: Number(user.auth_version), permissions };
}

async function loadAuthenticatedUser(userId, authVersion) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.is_active) return null;
  if (Number(user.auth_version) !== Number(authVersion)) return null;
  const roles = await authRepository.getActiveRolesByUserId(user.id);
  if (roles.length === 0) return null;
  return publicUser(user, roles);
}

async function changeOwnPassword({ userId, currentPassword, newPassword, metadata }) {
  if (!validatePassword(newPassword)) throw new HttpError(400, 'WEAK_PASSWORD', 'A nova senha deve ter entre 12 e 128 caracteres.');
  const user = await authRepository.findUserById(userId);
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password_hash))) {
    throw new HttpError(400, 'CURRENT_PASSWORD_INVALID', 'A senha atual está incorreta.');
  }
  if (await bcrypt.compare(newPassword, user.password_hash)) throw new HttpError(400, 'PASSWORD_REUSED', 'A nova senha deve ser diferente da senha atual.');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await authRepository.changePassword(userId, passwordHash);
  await createAuditLog({ userId, actionCode: 'AUTH_PASSWORD_CHANGED', entityType: 'USER', entityId: userId, metadata: sanitizeMetadata(metadata) });
}

async function recordLogout({ userId, metadata }) {
  await createAuditLog({ userId, actionCode: 'AUTH_LOGOUT', entityType: 'USER', entityId: userId, metadata: sanitizeMetadata(metadata) });
}

module.exports = { changeOwnPassword, loadAuthenticatedUser, login, publicUser, recordLogout };
