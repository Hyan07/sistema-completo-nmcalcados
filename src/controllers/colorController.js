'use strict';

const colorService = require('../services/colorService');

async function list(req, res, next) { try { res.status(200).json({ data: await colorService.listColors() }); } catch (error) { next(error); } }
async function create(req, res, next) { try { const id = await colorService.createColor(req.body, req.user); res.status(201).json({ id: String(id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { await colorService.updateColor(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }

module.exports = { create, list, update };
