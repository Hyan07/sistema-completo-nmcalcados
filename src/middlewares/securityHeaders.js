'use strict';

const { env } = require('../config/env');

function buildContentSecurityPolicy({ production = false } = {}) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'"
  ];
  if (production) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

function apiCachePolicy(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy({ production: env.isProduction }));
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (env.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
}

module.exports = { apiCachePolicy, buildContentSecurityPolicy, securityHeaders };
