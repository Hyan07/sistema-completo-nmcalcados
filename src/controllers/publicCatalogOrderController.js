'use strict';
const service=require('../services/catalogOrderService');
async function create(req,res,next){try{res.set('Cache-Control','no-store');res.status(201).json({data:await service.createPublicOrder(req.body)});}catch(e){next(e);}}
async function track(req,res,next){try{res.set('Cache-Control','no-store');res.json({data:await service.trackPublicOrder(req.body)});}catch(e){next(e);}}
module.exports={create,track};
