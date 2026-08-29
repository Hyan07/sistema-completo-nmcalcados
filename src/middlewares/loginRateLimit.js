'use strict';

const { HttpError } = require('../utils/httpError');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;
const buckets = new Map();
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) if (value.resetAt <= now) buckets.delete(key);
}, WINDOW_MS);
cleanupTimer.unref();

function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  current.count += 1;
  if (current.count > MAX_ATTEMPTS) return next(new HttpError(429, 'TOO_MANY_LOGIN_REQUESTS', 'Muitas tentativas de login. Tente novamente mais tarde.'));
  return next();
}

module.exports = { loginRateLimit };
