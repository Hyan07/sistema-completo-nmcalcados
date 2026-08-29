'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const parsedDbPort = Number.parseInt(process.env.DB_PORT || '3306', 10);
const parsedDbConnectionLimit = Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);
const parsedSessionMaxAgeMinutes = Number.parseInt(process.env.SESSION_MAX_AGE_MINUTES || '480', 10);
const parsedBcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}
if (!Number.isInteger(parsedSessionMaxAgeMinutes) || parsedSessionMaxAgeMinutes < 5 || parsedSessionMaxAgeMinutes > 10080) {
  throw new Error('SESSION_MAX_AGE_MINUTES deve ser um inteiro entre 5 e 10080.');
}
if (!Number.isInteger(parsedBcryptRounds) || parsedBcryptRounds < 10 || parsedBcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS deve ser um inteiro entre 10 e 15.');
}

const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsedPort,
  db: Object.freeze({
    host: process.env.DB_HOST || '',
    port: parsedDbPort,
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parsedDbConnectionLimit
  }),
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionMaxAgeMinutes: parsedSessionMaxAgeMinutes,
  bcryptRounds: parsedBcryptRounds
});

module.exports = { env };
