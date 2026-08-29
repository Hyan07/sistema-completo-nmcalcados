'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}

const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsedPort,
  db: Object.freeze({
    host: process.env.DB_HOST || '',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || ''
  }),
  sessionSecret: process.env.SESSION_SECRET || ''
});

module.exports = { env };
