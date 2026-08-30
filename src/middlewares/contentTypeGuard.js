'use strict';

const { HttpError } = require('../utils/httpError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOWED_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data'
];

function hasRequestBody(req) {
  const length = Number(req.headers?.['content-length'] || 0);
  return length > 0 || Boolean(req.headers?.['transfer-encoding']);
}

function apiContentTypeGuard(req, res, next) {
  if (SAFE_METHODS.has(String(req.method || '').toUpperCase()) || !hasRequestBody(req)) return next();
  const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
  if (ALLOWED_TYPES.some((type) => contentType.startsWith(type))) return next();
  return next(new HttpError(415, 'UNSUPPORTED_CONTENT_TYPE', 'Tipo de conteúdo não suportado para esta API.'));
}

module.exports = { ALLOWED_TYPES, apiContentTypeGuard, hasRequestBody };
