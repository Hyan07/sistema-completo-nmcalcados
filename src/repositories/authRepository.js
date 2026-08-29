'use strict';

const { getPool } = require('../config/database');

const USER_SELECT = `
  SELECT
    u.id, u.role_id, u.name, u.username, u.email, u.password_hash,
    u.is_active, u.last_login_at, u.password_changed_at,
    u.failed_login_attempts, u.locked_until, u.auth_version,
    r.code AS role_code, r.name AS role_name, r.is_active AS role_is_active
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
`;

async function findUserByUsername(username) {
  const [rows] = await getPool().execute(`${USER_SELECT} WHERE u.username = ? LIMIT 1`, [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await getPool().execute(`${USER_SELECT} WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function getPermissionsByUserId(userId) {
  const [rows] = await getPool().execute(
    `SELECT p.code
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.is_active = 1
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ? AND u.is_active = 1
      ORDER BY p.code`,
    [userId]
  );
  return rows.map((row) => row.code);
}

async function recordFailedLogin(userId, lockedUntil) {
  await getPool().execute(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = ? WHERE id = ?`,
    [lockedUntil, userId]
  );
}

async function recordSuccessfulLogin(userId) {
  await getPool().execute(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
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
  getPermissionsByUserId,
  recordFailedLogin,
  recordSuccessfulLogin
};
