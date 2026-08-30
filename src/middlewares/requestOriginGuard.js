'use strict';

const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function header(req, name) {
  if (typeof req.get === 'function') return req.get(name);
  return req.headers?.[String(name).toLowerCase()] || null;
}

function normalizeOrigin(value) {
  if (!value || value === 'null') return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch (_) {
    return null;
  }
}

function requestOrigin(req) {
  if (env.appOrigin) return env.appOrigin;
  const protocol = req.protocol || 'http';
  const host = header(req, 'host');
  return host ? normalizeOrigin(`${protocol}://${host}`) : null;
}

function sourceOrigin(req) {
  const origin = normalizeOrigin(header(req, 'origin'));
  if (origin) return origin;
  const referer = header(req, 'referer');
  return normalizeOrigin(referer);
}

function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(String(req.method || '').toUpperCase())) return next();

  const fetchSite = String(header(req, 'sec-fetch-site') || '').toLowerCase();
  if (fetchSite === 'cross-site') {
    return next(new HttpError(403, 'UNTRUSTED_REQUEST_ORIGIN', 'Origem da requisição não autorizada.'));
  }

  const expected = requestOrigin(req);
  const source = sourceOrigin(req);
  const authenticated = Boolean(req.session?.auth?.userId);

  if (source && expected && source !== expected) {
    return next(new HttpError(403, 'UNTRUSTED_REQUEST_ORIGIN', 'Origem da requisição não autorizada.'));
  }

  // Para sessão autenticada, uma mutação sem Origin/Referer não é aceita.
  // Requisições públicas sem cookie (ex.: catálogo/API CLI) continuam possíveis.
  if (authenticated && (!source || !expected)) {
    return next(new HttpError(403, 'REQUEST_ORIGIN_REQUIRED', 'Não foi possível validar a origem da requisição autenticada.'));
  }

  return next();
}

module.exports = { normalizeOrigin, requestOrigin, requireTrustedOrigin, sourceOrigin };
