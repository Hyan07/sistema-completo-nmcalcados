'use strict';

const stockService = require('../services/stockService');

async function summary(req, res, next) { try { res.json({ data: await stockService.getSummary() }); } catch (error) { next(error); } }
async function listItems(req, res, next) { try { res.json(await stockService.listStockItems(req.query)); } catch (error) { next(error); } }
async function getItem(req, res, next) { try { res.json({ data: await stockService.getStockItem(req.params.skuId) }); } catch (error) { next(error); } }
async function movementTypes(req, res, next) { try { res.json({ data: await stockService.listMovementTypes() }); } catch (error) { next(error); } }
async function movements(req, res, next) { try { res.json(await stockService.listMovements(req.query)); } catch (error) { next(error); } }
async function createMovement(req, res, next) {
  try { res.status(201).json({ data: await stockService.createManualMovement(req.params.skuId, req.body, req.user) }); }
  catch (error) { next(error); }
}
async function count(req, res, next) {
  try { res.status(200).json({ data: await stockService.countInventory(req.params.skuId, req.body, req.user) }); }
  catch (error) { next(error); }
}

module.exports = { count, createMovement, getItem, listItems, movementTypes, movements, summary };
