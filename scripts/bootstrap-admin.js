'use strict';

const bcrypt = require('bcrypt');
const { env } = require('../src/config/env');
const { closePool, getPool } = require('../src/config/database');
const { normalizeEmail, normalizeUsername, validateEmail, validateName, validatePassword, validateUsername } = require('../src/utils/authValidation');

async function main() {
  const name = String(process.env.ADMIN_NAME || '').trim();
  const username = normalizeUsername(process.env.ADMIN_USERNAME);
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || '';
  if (!validateName(name)) throw new Error('ADMIN_NAME deve possuir entre 2 e 150 caracteres.');
  if (!validateUsername(username)) throw new Error('ADMIN_USERNAME inválido.');
  if (!validateEmail(email)) throw new Error('ADMIN_EMAIL inválido.');
  if (!validatePassword(password) || password === 'troque-por-uma-senha-forte') throw new Error('ADMIN_PASSWORD deve possuir entre 12 e 128 caracteres e não pode usar o placeholder do .env.example.');

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [roleRows] = await connection.execute("SELECT id FROM roles WHERE code = 'ADMINISTRADOR' AND is_active = 1 LIMIT 1");
    if (!roleRows[0]) throw new Error('Cargo ADMINISTRADOR não encontrado. Execute npm run db:migrate antes.');

    const [existingRows] = await connection.execute('SELECT id FROM users WHERE username = ? LIMIT 1 FOR UPDATE', [username]);
    if (existingRows[0]) {
      const [assignmentRows] = await connection.execute(
        'SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1',
        [existingRows[0].id, roleRows[0].id]
      );
      if (!assignmentRows[0]) throw new Error('O username informado já pertence a um usuário que não possui o cargo de administrador.');
      console.log('Administrador já existe. Nenhuma alteração realizada.');
      await connection.rollback();
      return;
    }

    const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM users');
    if (Number(countRows[0].total) > 0) throw new Error('Bootstrap recusado: já existem usuários. Crie novos administradores pela aplicação autenticada.');
    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
    const [result] = await connection.execute(
      `INSERT INTO users (name, username, email, password_hash, password_changed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
      [name, username, email, passwordHash]
    );
    await connection.execute('INSERT INTO user_roles (user_id, role_id, assigned_by_user_id) VALUES (?, ?, NULL)', [result.insertId, roleRows[0].id]);
    await connection.commit();
    console.log('Primeiro administrador criado com sucesso. Remova ADMIN_PASSWORD do ambiente após o bootstrap.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

main()
  .catch((error) => { console.error('Falha ao criar administrador inicial:', error.message); process.exitCode = 1; })
  .finally(async () => { await closePool(); });
