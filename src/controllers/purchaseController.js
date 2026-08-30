'use strict';
const purchaseService = require('../services/purchaseService');
async function list(req,res,next){try{res.json(await purchaseService.listPurchases(req.query));}catch(error){next(error);}}
async function lookupSkus(req,res,next){try{res.json({data:await purchaseService.lookupSkus(req.query)});}catch(error){next(error);}}
async function getById(req,res,next){try{res.json({data:await purchaseService.getPurchase(req.params.id)});}catch(error){next(error);}}
async function create(req,res,next){try{res.status(201).json({id:await purchaseService.createPurchase(req.body,req.user)});}catch(error){next(error);}}
async function update(req,res,next){try{await purchaseService.updatePurchase(req.params.id,req.body,req.user);res.status(204).end();}catch(error){next(error);}}
async function addItem(req,res,next){try{res.status(201).json({id:await purchaseService.addPurchaseItem(req.params.id,req.body,req.user)});}catch(error){next(error);}}
async function updateItem(req,res,next){try{await purchaseService.updatePurchaseItem(req.params.id,req.params.itemId,req.body,req.user);res.status(204).end();}catch(error){next(error);}}
async function cancelItem(req,res,next){try{await purchaseService.cancelPurchaseItem(req.params.id,req.params.itemId,req.user);res.status(204).end();}catch(error){next(error);}}
async function order(req,res,next){try{await purchaseService.orderPurchase(req.params.id,req.user);res.status(204).end();}catch(error){next(error);}}
async function cancel(req,res,next){try{await purchaseService.cancelPurchase(req.params.id,req.body,req.user);res.status(204).end();}catch(error){next(error);}}
async function receive(req,res,next){try{res.status(201).json({data:await purchaseService.receivePurchase(req.params.id,req.body,req.user)});}catch(error){next(error);}}
module.exports={addItem,cancel,cancelItem,create,getById,list,lookupSkus,order,receive,update,updateItem};
