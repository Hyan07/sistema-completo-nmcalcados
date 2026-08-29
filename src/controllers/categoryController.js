'use strict';

const categoryService = require('../services/categoryService');

async function list(req, res, next) {
  try { res.status(200).json({ data: await categoryService.listCategories(req.query) }); }
  catch (error) { next(error); }
}

async function create(req, res, next) {
  try { const id = await categoryService.createCategory(req.body, req.user); res.status(201).json({ id: String(id) }); }
  catch (error) { next(error); }
}

async function update(req, res, next) {
  try { await categoryService.updateCategory(req.params.id, req.body, req.user); res.status(204).end(); }
  catch (error) { next(error); }
}

module.exports = { create, list, update };
