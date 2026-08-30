'use strict';
const customerService = require('../services/customerService');
async function list(req,res,next){try{res.json(await customerService.listCustomers(req.query));}catch(error){next(error);}}
async function lookup(req,res,next){try{res.json({data:await customerService.lookupCustomers(req.query)});}catch(error){next(error);}}
async function getById(req,res,next){try{res.json({data:await customerService.getCustomer(req.params.id)});}catch(error){next(error);}}
async function create(req,res,next){try{const id=await customerService.createCustomer(req.body,req.user);res.status(201).json({id:String(id)});}catch(error){next(error);}}
async function update(req,res,next){try{await customerService.updateCustomer(req.params.id,req.body,req.user);res.status(204).end();}catch(error){next(error);}}
module.exports={create,getById,list,lookup,update};
