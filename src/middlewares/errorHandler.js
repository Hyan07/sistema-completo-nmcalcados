'use strict';

const { env } = require('../config/env');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number(error.status) || 500;
  const meta = {
    requestId: req.requestId || null,
    method: req.method,
    path: req.path,
    status,
    code: error.code || 'INTERNAL_SERVER_ERROR'
  };

  if (status >= 500) {
    if (env.isProduction) console.error('[NM Calçados] erro interno:', JSON.stringify(meta));
    else console.error('[NM Calçados] erro interno:', meta, error);
  }

  return res.status(status).json({
    error: error.code || 'INTERNAL_SERVER_ERROR',
    message: error.status ? error.message : 'Ocorreu um erro interno no servidor.',
    requestId: req.requestId || undefined,
    ...(env.isProduction ? {} : { detail: error.message })
  });
}

module.exports = { errorHandler };
