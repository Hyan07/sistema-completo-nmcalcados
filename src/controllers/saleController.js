'use strict';
const saleService = require('../services/saleService');
const saleCancellationService = require('../services/saleCancellationService');
async function list(req,res,next){try{res.json(await saleService.listSales(req.query));}catch(e){next(e);}}
async function lookupSkus(req,res,next){try{res.json({data:await saleService.lookupSkus(req.query)});}catch(e){next(e);}}
async function getById(req,res,next){try{res.json({data:await saleService.getSale(req.params.id)});}catch(e){next(e);}}
async function create(req,res,next){try{res.status(201).json({id:await saleService.createSale(req.body,req.user)});}catch(e){next(e);}}
async function update(req,res,next){try{await saleService.updateSale(req.params.id,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function addItem(req,res,next){try{res.status(201).json({id:await saleService.addSaleItem(req.params.id,req.body,req.user)});}catch(e){next(e);}}
async function updateItem(req,res,next){try{await saleService.updateSaleItem(req.params.id,req.params.itemId,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function cancelItem(req,res,next){try{await saleService.cancelSaleItem(req.params.id,req.params.itemId,req.user);res.status(204).end();}catch(e){next(e);}}
async function pricing(req,res,next){try{await saleService.updateSalePricing(req.params.id,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function itemDiscount(req,res,next){try{await saleService.updateItemDiscount(req.params.id,req.params.itemId,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function finalize(req,res,next){try{res.json({data:await saleService.finalizeSale(req.params.id,req.body,req.user)});}catch(e){next(e);}}
async function cancel(req,res,next){try{res.json({data:await saleCancellationService.cancelSale(req.params.id,req.body,req.user)});}catch(e){next(e);}}
module.exports={addItem,cancel,cancelItem,create,finalize,getById,itemDiscount,list,lookupSkus,pricing,update,updateItem};
