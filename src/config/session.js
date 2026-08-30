'use strict';

const session = require('express-session');
const { env } = require('./env');
const { MySqlSessionStore } = require('./sessionStore');

function createSessionMiddleware() {
  if (!env.sessionSecret || env.sessionSecret.length < 32 || env.sessionSecret.includes('gere-um-segredo')) {
    throw new Error('SESSION_SECRET deve possuir pelo menos 32 caracteres.');
  }

  const store = new MySqlSessionStore();
  store.clearExpired().catch((error) => {
    console.error('[NM Calçados] falha ao limpar sessões expiradas:', error.message);
  });

  return session({
    name: 'nm.sid',
    secret: env.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    unset: 'destroy',
    cookie: {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      priority: 'high',
      path: '/',
      maxAge: env.sessionMaxAgeMinutes * 60 * 1000
    }
  });
}

module.exports = { createSessionMiddleware };
