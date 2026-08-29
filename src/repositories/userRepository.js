'use strict';

const { getPool } = require('../config/database');

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

async function listUsers() {
  const [users] = await getPool().query(`
    SELECT id, name, username, email, is_active, last_login_at, created_at, updated_at
      FROM users
     ORDER BY name, id
  `);

  if (users.length === 0) return [];
  const ids = users.map((user) => user.id);
  const inClause = placeholders(ids);

  const [roleRows] = await getPool().execute(
    `SELECT ur.user_id, r.id, r.code, r.name, r.is_active
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id IN (${inClause})
      ORDER BY r.name, r.id`,
    ids
  );
  const [permissionRows] = await getPool().execute(
    `SELECT up.user_id, p.id, p.code, p.description
       FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id IN (${inClause})
      ORDER BY p.code, p.id`,
    ids
  );

  const rolesByUser = new Map();
  const permissionsByUser = new Map();
  for (const row of roleRows) {
    const key = String(row.user_id);
    if (!rolesByUser.has(key)) rolesByUser.set(key, []);
    rolesByUser.get(key).push({ id: String(row.id), code: row.code, name: row.name, is_active: Boolean(row.is_active) });
  }
  for (const row of permissionRows) {
    const key = String(row.user_id);
    if (!permissionsByUser.has(key)) permissionsByUser.set(key, []);
    permissionsByUser.get(key).push({ id: String(row.id), code: row.code, description: row.description });
  }

  return users.map((user) => ({
    ...user,
    roles: rolesByUser.get(String(user.id)) || [],
    direct_permissions: permissionsByUser.get(String(user.id)) || []
  }));
}

async function findUserForUpdate(id, connection) {
  const [rows] = await connection.execute(
    `SELECT id, name, username, email, is_active, auth_version
       FROM users
      WHERE id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function findRolesByIds(roleIds, connection = null) {
  if (roleIds.length === 0) return [];
  const db = connection || getPool();
  const [rows] = await db.execute(
    `SELECT id, code, name, is_active FROM roles WHERE id IN (${placeholders(roleIds)}) ORDER BY name, id`,
    roleIds
  );
  return rows;
}

async function findPermissionsByIds(permissionIds, connection = null) {
  if (permissionIds.length === 0) return [];
  const db = connection || getPool();
  const [rows] = await db.execute(
    `SELECT id, code, description FROM permissions WHERE id IN (${placeholders(permissionIds)}) ORDER BY code, id`,
    permissionIds
  );
  return rows;
}

async function getUserRoleIds(userId, connection) {
  const [rows] = await connection.execute('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id', [userId]);
  return rows.map((row) => Number(row.role_id));
}

async function getUserPermissionIds(userId, connection) {
  const [rows] = await connection.execute('SELECT permission_id FROM user_permissions WHERE user_id = ? ORDER BY permission_id', [userId]);
  return rows.map((row) => Number(row.permission_id));
}

async function listRoles() {
  const [rows] = await getPool().query(`
    SELECT r.id, r.code, r.name, r.description, r.is_active,
           COALESCE(JSON_ARRAYAGG(p.code), JSON_ARRAY()) AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id, r.code, r.name, r.description, r.is_active
     ORDER BY r.name
  `);
  return rows.map((row) => ({
    ...row,
    permissions: Array.isArray(row.permissions) ? row.permissions.filter(Boolean) : JSON.parse(row.permissions || '[]').filter(Boolean)
  }));
}

async function listPermissions() {
  const [rows] = await getPool().query('SELECT id, code, description FROM permissions ORDER BY code');
  return rows;
}

async function updateUser(id, changes, connection) {
  const columns = [];
  const values = [];
  const mapping = { name: 'name', username: 'username', email: 'email', isActive: 'is_active' };

  for (const [key, column] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      columns.push(`${column} = ?`);
      values.push(changes[key]);
    }
  }
  if (columns.length === 0) return;
  values.push(id);
  await connection.execute(`UPDATE users SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function replaceUserRoles(userId, roleIds, actorId, connection) {
  await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
  if (roleIds.length === 0) return;
  const valuesSql = roleIds.map(() => '(?, ?, ?)').join(', ');
  const values = roleIds.flatMap((roleId) => [userId, roleId, actorId]);
  await connection.execute(
    `INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES ${valuesSql}`,
    values
  );
}

async function replaceUserPermissions(userId, permissionIds, actorId, connection) {
  await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  if (permissionIds.length === 0) return;
  const valuesSql = permissionIds.map(() => '(?, ?, ?)').join(', ');
  const values = permissionIds.flatMap((permissionId) => [userId, permissionId, actorId]);
  await connection.execute(
    `INSERT INTO user_permissions (user_id, permission_id, granted_by_user_id) VALUES ${valuesSql}`,
    values
  );
}

async function incrementAuthVersion(userId, connection) {
  await connection.execute('UPDATE users SET auth_version = auth_version + 1 WHERE id = ?', [userId]);
}

async function countActiveAdministratorsForUpdate(connection) {
  const [rows] = await connection.query(`
    SELECT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.code = 'ADMINISTRADOR' AND r.is_active = 1
     WHERE u.is_active = 1
     FOR UPDATE
  `);
  return rows.length;
}

module.exports = {
  countActiveAdministratorsForUpdate,
  findPermissionsByIds,
  findRolesByIds,
  findUserForUpdate,
  getUserPermissionIds,
  getUserRoleIds,
  incrementAuthVersion,
  listPermissions,
  listRoles,
  listUsers,
  replaceUserPermissions,
  replaceUserRoles,
  updateUser
};
