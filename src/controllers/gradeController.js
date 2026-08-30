'use strict';

const gradeService = require('../services/gradeService');

async function get(req, res, next) { try { res.status(200).json({ data: await gradeService.getGrade(req.params.productId) }); } catch (error) { next(error); } }
async function createVariant(req, res, next) { try { const id = await gradeService.createVariant(req.params.productId, req.body, req.user); res.status(201).json({ id: String(id) }); } catch (error) { next(error); } }
async function updateVariant(req, res, next) { try { await gradeService.updateVariant(req.params.productId, req.params.variantId, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function createSkus(req, res, next) { try { const ids = await gradeService.createSkus(req.params.productId, req.params.variantId, req.body, req.user); res.status(201).json({ ids }); } catch (error) { next(error); } }
async function assignImageVariant(req, res, next) { try { await gradeService.assignImageVariant(req.params.productId, req.params.imageId, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function updateSku(req, res, next) { try { await gradeService.updateSku(req.params.productId, req.params.variantId, req.params.skuId, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }

module.exports = { assignImageVariant, createSkus, createVariant, get, updateSku, updateVariant };
