'use strict';

const mysql = require('mysql2/promise');
const { env } = require('./env');

let pool;

function getDatabaseConfig({ multipleStatements = false } = {}) {
  const required = {
    DB_HOST: env.db.host,
    DB_NAME: env.db.name,
    DB_USER: env.db.user,
    DB_PASSWORD: env.db.password
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Variáveis de banco ausentes: ${missing.join(', ')}.`);
  }

  if (!Number.isInteger(env.db.port) || env.db.port < 1 || env.db.port > 65535) {
    throw new Error('DB_PORT deve ser um número inteiro entre 1 e 65535.');
  }

  if (!Number.isInteger(env.db.connectionLimit) || env.db.connectionLimit < 1 || env.db.connectionLimit > 100) {
    throw new Error('DB_CONNECTION_LIMIT deve ser um inteiro entre 1 e 100.');
  }

  return {
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
    charset: 'utf8mb4',
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDatabaseConfig());
  }

  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  closePool,
  getDatabaseConfig,
  getPool
};
