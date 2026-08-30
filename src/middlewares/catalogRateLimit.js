'use strict';

function createCatalogRateLimit({ windowMs = 60_000, max = 180, now = () => Date.now() } = {}) {
  const buckets = new Map();
  let calls = 0;
  return function catalogRateLimit(req, res, next) {
    const current = now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= current ? { count: 0, resetAt: current + windowMs } : existing;
    bucket.count += 1;
    buckets.set(key, bucket);
    calls += 1;
    if (calls % 500 === 0) {
      for (const [bucketKey, value] of buckets.entries()) if (value.resetAt <= current) buckets.delete(bucketKey);
    }
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - current) / 1000))));
      return res.status(429).json({ code: 'CATALOG_RATE_LIMIT', message: 'Muitas consultas ao catálogo. Tente novamente em instantes.' });
    }
    return next();
  };
}

const catalogRateLimit = createCatalogRateLimit();
module.exports = { catalogRateLimit, createCatalogRateLimit };
