'use strict';

const productService = require('../services/productService');

async function list(req, res, next) {
  try { res.status(200).json(await productService.listProducts(req.query)); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.status(200).json({ data: await productService.getProduct(req.params.id) }); }
  catch (error) { next(error); }
}

async function create(req, res, next) {
  try { const id = await productService.createProduct(req.body, req.user); res.status(201).json({ id: String(id) }); }
  catch (error) { next(error); }
}

async function update(req, res, next) {
  try { await productService.updateProduct(req.params.id, req.body, req.user); res.status(204).end(); }
  catch (error) { next(error); }
}

async function addImages(req, res, next) {
  try { res.status(201).json({ data: await productService.addImages(req.params.id, req.files, req.body, req.user) }); }
  catch (error) { next(error); }
}

async function updateImage(req, res, next) {
  try { res.status(200).json({ data: await productService.updateImage(req.params.id, req.params.imageId, req.body, req.user) }); }
  catch (error) { next(error); }
}

async function removeImage(req, res, next) {
  try { await productService.removeImage(req.params.id, req.params.imageId, req.user); res.status(204).end(); }
  catch (error) { next(error); }
}

module.exports = { addImages, create, getById, list, removeImage, update, updateImage };
