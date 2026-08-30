'use strict';

const { HttpError } = require('../utils/httpError');

function createApiRateLimit({ windowMs = 60_000, max = 1200, now = () => Date.now() } = {}) {
  const buckets = new Map();
  let calls = 0;

  return function apiRateLimit(req, res, next) {
    const current = now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= current
      ? { count: 0, resetAt: current + windowMs }
      : existing;

    bucket.count += 1;
    buckets.set(key, bucket);
    calls += 1;

    if (calls % 500 === 0) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (value.resetAt <= current) buckets.delete(bucketKey);
      }
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return next(new HttpError(429, 'API_RATE_LIMIT', 'Muitas requisições. Tente novamente em instantes.'));
    }

    return next();
  };
}

const apiRateLimit = createApiRateLimit();
module.exports = { apiRateLimit, createApiRateLimit };
