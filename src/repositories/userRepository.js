'use strict';

const { getPool } = require('../config/database');

async function listUsers() {
  const [rows] = await getPool().query(`
    SELECT u.id, u.name, u.username, u.email, u.is_active, u.last_login_at,
           u.created_at, u.updated_at, u.role_id, r.code AS role_code, r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.name, u.id
  `);
  return rows;
}

async function findUserForUpdate(id, connection) {
  const [rows] = await connection.execute(
    `SELECT u.id, u.name, u.username, u.email, u.is_active, u.role_id, u.auth_version,
            r.code AS role_code, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function findRoleById(roleId, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute('SELECT id, code, name, is_active FROM roles WHERE id = ? LIMIT 1', [roleId]);
  return rows[0] || null;
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
  const mapping = { name: 'name', username: 'username', email: 'email', roleId: 'role_id', isActive: 'is_active' };

  for (const [key, column] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      columns.push(`${column} = ?`);
      values.push(changes[key]);
    }
  }

  if (columns.length === 0) return;
  if (Object.prototype.hasOwnProperty.call(changes, 'roleId') || Object.prototype.hasOwnProperty.call(changes, 'isActive')) {
    columns.push('auth_version = auth_version + 1');
  }
  values.push(id);
  await connection.execute(`UPDATE users SET ${columns.join(', ')} WHERE id = ?`, values);
}

async function countActiveAdministrators(connection) {
  const [rows] = await connection.query(`
    SELECT COUNT(*) AS total
      FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.is_active = 1 AND r.code = 'ADMINISTRADOR'
  `);
  return Number(rows[0].total);
}

module.exports = {
  countActiveAdministrators,
  findRoleById,
  findUserForUpdate,
  listPermissions,
  listRoles,
  listUsers,
  updateUser
};
