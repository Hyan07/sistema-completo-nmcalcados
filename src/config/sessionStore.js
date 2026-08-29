'use strict';

const session = require('express-session');
const { getPool } = require('./database');

class MySqlSessionStore extends session.Store {
  get(sid, callback) {
    getPool().execute(
      'SELECT sess, expires_at FROM app_sessions WHERE sid = ? AND expires_at > CURRENT_TIMESTAMP(3) LIMIT 1',
      [sid]
    ).then(([rows]) => {
      if (!rows[0]) return callback(null, null);
      const value = typeof rows[0].sess === 'string' ? JSON.parse(rows[0].sess) : rows[0].sess;
      return callback(null, value);
    }).catch(callback);
  }

  set(sid, sess, callback = () => {}) {
    try {
      const expiresAt = sess.cookie?.expires
        ? new Date(sess.cookie.expires)
        : new Date(Date.now() + 8 * 60 * 60 * 1000);
      const userId = sess.auth?.userId || null;

      getPool().execute(
        `INSERT INTO app_sessions (sid, user_id, sess, expires_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           sess = VALUES(sess),
           expires_at = VALUES(expires_at)`,
        [sid, userId, JSON.stringify(sess), expiresAt]
      ).then(() => callback(null)).catch(callback);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    getPool().execute('DELETE FROM app_sessions WHERE sid = ?', [sid])
      .then(() => callback(null))
      .catch(callback);
  }

  touch(sid, sess, callback = () => {}) {
    const expiresAt = sess.cookie?.expires
      ? new Date(sess.cookie.expires)
      : new Date(Date.now() + 8 * 60 * 60 * 1000);

    getPool().execute(
      'UPDATE app_sessions SET sess = ?, expires_at = ? WHERE sid = ?',
      [JSON.stringify(sess), expiresAt, sid]
    ).then(() => callback(null)).catch(callback);
  }

  async clearExpired() {
    await getPool().query('DELETE FROM app_sessions WHERE expires_at <= CURRENT_TIMESTAMP(3)');
  }
}

module.exports = { MySqlSessionStore };
