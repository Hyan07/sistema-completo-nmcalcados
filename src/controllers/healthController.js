'use strict';

const healthService = require('../services/healthService');

function live(req, res) {
  return res.status(200).json({ status: 'ok', application: 'nm-calcados' });
}

async function ready(req, res) {
  try {
    const result = await healthService.readiness();
    return res.status(result.ready ? 200 : 503).json({ status: result.ready ? 'ready' : 'not_ready', ...result });
  } catch (_) {
    return res.status(503).json({ status: 'not_ready', ready: false, database: 'unavailable' });
  }
}

module.exports = { live, ready };
