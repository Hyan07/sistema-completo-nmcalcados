'use strict';
const supplierService = require('../services/supplierService');
async function list(req,res,next){try{res.json(await supplierService.listSuppliers(req.query));}catch(error){next(error);}}
async function lookup(req,res,next){try{res.json({data:await supplierService.lookupSuppliers(req.query)});}catch(error){next(error);}}
async function getById(req,res,next){try{res.json({data:await supplierService.getSupplier(req.params.id)});}catch(error){next(error);}}
async function create(req,res,next){try{res.status(201).json({id:await supplierService.createSupplier(req.body,req.user)});}catch(error){next(error);}}
async function update(req,res,next){try{await supplierService.updateSupplier(req.params.id,req.body,req.user);res.status(204).end();}catch(error){next(error);}}
module.exports={create,getById,list,lookup,update};
