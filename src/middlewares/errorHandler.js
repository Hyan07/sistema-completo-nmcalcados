'use strict';

const { env } = require('../config/env');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error('[NM Calçados] erro não tratado:', error);

  return res.status(error.status || 500).json({
    error: error.code || 'INTERNAL_SERVER_ERROR',
    message: error.status ? error.message : 'Ocorreu um erro interno no servidor.',
    ...(env.isProduction ? {} : { detail: error.message })
  });
}

module.exports = { errorHandler };
