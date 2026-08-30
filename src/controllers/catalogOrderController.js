'use strict';
const service=require('../services/catalogOrderService');
async function list(req,res,next){try{res.set('Cache-Control','no-store');res.json(await service.listOrders(req.query));}catch(e){next(e);}}
async function get(req,res,next){try{res.set('Cache-Control','no-store');res.json({data:await service.getOrder(req.params.id)});}catch(e){next(e);}}
async function update(req,res,next){try{await service.updateOrder(req.params.id,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function confirm(req,res,next){try{res.json({data:await service.confirmOrder(req.params.id,req.body,req.user)});}catch(e){next(e);}}
async function cancel(req,res,next){try{res.json({data:await service.cancelOrder(req.params.id,req.body,req.user)});}catch(e){next(e);}}
async function convert(req,res,next){try{res.json({data:await service.convertOrder(req.params.id,req.body,req.user)});}catch(e){next(e);}}
module.exports={cancel,confirm,convert,get,list,update};
