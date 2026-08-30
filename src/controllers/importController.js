'use strict';

const service = require('../services/importService');

async function list(req, res, next) { try { res.json(await service.list(req.query)); } catch (e) { next(e); } }
async function get(req, res, next) { try { res.json({ data: await service.get(req.params.id) }); } catch (e) { next(e); } }
async function template(req, res, next) {
  try {
    const file = await service.template(req.params.type);
    res.set('Cache-Control', 'no-store');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  } catch (e) { next(e); }
}
async function validate(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.status(201).json(await service.validateUpload({ type: req.body.type, file: req.file, operationKey: req.body.operationKey }, req.user));
  } catch (e) { next(e); }
}
async function apply(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await service.apply(req.params.id, { file: req.file, operationKey: req.body.operationKey, confirmation: req.body.confirmation }, req.user));
  } catch (e) { next(e); }
}

module.exports = { apply, get, list, template, validate };
