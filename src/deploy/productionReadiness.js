'use strict';

function isPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  return !text || text.includes('troque-') || text.includes('gere-um-') || text.includes('example') || text.includes('exemplo');
}

function validateProductionEnvironment(source = process.env) {
  const errors = [];
  const warnings = [];
  if (source.NODE_ENV !== 'production') errors.push('NODE_ENV deve ser production.');

  let origin = null;
  try { origin = new URL(String(source.APP_ORIGIN || '').trim()); }
  catch (_) { errors.push('APP_ORIGIN deve ser uma origem HTTPS válida.'); }
  if (origin) {
    if (origin.protocol !== 'https:') errors.push('APP_ORIGIN deve usar HTTPS em produção.');
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) errors.push('APP_ORIGIN deve conter somente protocolo + host, sem caminho, query ou credenciais.');
  }

  for (const name of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
    if (isPlaceholder(source[name])) errors.push(`${name} está ausente ou usa placeholder.`);
  }
  const secret = String(source.SESSION_SECRET || '');
  if (secret.length < 32 || isPlaceholder(secret)) errors.push('SESSION_SECRET deve possuir pelo menos 32 caracteres e não pode ser placeholder.');

  if (String(source.ADMIN_PASSWORD || '').trim()) errors.push('ADMIN_PASSWORD deve ser removida do ambiente após o bootstrap do primeiro administrador.');
  if (String(source.ADMIN_EMAIL || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(source.ADMIN_EMAIL).trim())) warnings.push('ADMIN_EMAIL está preenchido, mas não parece um e-mail válido.');

  const dbPort = Number.parseInt(source.DB_PORT || '3306', 10);
  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) errors.push('DB_PORT inválida.');
  const limit = Number.parseInt(source.DB_CONNECTION_LIMIT || '10', 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push('DB_CONNECTION_LIMIT deve ficar entre 1 e 100.');

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { isPlaceholder, validateProductionEnvironment };
