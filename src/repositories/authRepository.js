'use strict';

const { getPool } = require('../config/database');

const USER_SELECT = `
  SELECT
    u.id, u.name, u.username, u.email, u.password_hash,
    u.is_active, u.last_login_at, u.password_changed_at,
    u.failed_login_attempts, u.locked_until, u.auth_version
  FROM users u
`;

async function findUserByUsername(username) {
  const [rows] = await getPool().execute(`${USER_SELECT} WHERE u.username = ? LIMIT 1`, [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await getPool().execute(`${USER_SELECT} WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function getActiveRolesByUserId(userId) {
  const [rows] = await getPool().execute(
    `SELECT r.id, r.code, r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
      WHERE ur.user_id = ?
      ORDER BY r.name, r.id`,
    [userId]
  );
  return rows;
}

async function getPermissionsByUserId(userId) {
  const [rows] = await getPool().execute(
    `SELECT DISTINCT p.code
       FROM permissions p
      WHERE p.id IN (
        SELECT rp.permission_id
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
          JOIN role_permissions rp ON rp.role_id = r.id
         WHERE ur.user_id = ?
        UNION
        SELECT up.permission_id
          FROM user_permissions up
         WHERE up.user_id = ?
      )
      ORDER BY p.code`,
    [userId, userId]
  );
  return rows.map((row) => row.code);
}

async function recordFailedLogin(userId, lockedUntil) {
  await getPool().execute(
    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = ? WHERE id = ?',
    [lockedUntil, userId]
  );
}

async function recordSuccessfulLogin(userId) {
  await getPool().execute(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [userId]
  );
}

async function changePassword(userId, passwordHash) {
  await getPool().execute(
    `UPDATE users
        SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP(3),
            auth_version = auth_version + 1, failed_login_attempts = 0, locked_until = NULL
      WHERE id = ?`,
    [passwordHash, userId]
  );
}

module.exports = {
  changePassword,
  findUserById,
  findUserByUsername,
  getActiveRolesByUserId,
  getPermissionsByUserId,
  recordFailedLogin,
  recordSuccessfulLogin
};
