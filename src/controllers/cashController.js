'use strict';
const cashService = require('../services/cashService');
async function registers(req,res,next){try{res.json({data:await cashService.listRegisters()});}catch(e){next(e);}}
async function createRegister(req,res,next){try{res.status(201).json({id:await cashService.createRegister(req.body,req.user)});}catch(e){next(e);}}
async function updateRegister(req,res,next){try{await cashService.updateRegister(req.params.id,req.body,req.user);res.status(204).end();}catch(e){next(e);}}
async function sessions(req,res,next){try{res.json({data:await cashService.listSessions(req.query)});}catch(e){next(e);}}
async function current(req,res,next){try{res.json({data:await cashService.getCurrentSession(req.user)});}catch(e){next(e);}}
async function getSession(req,res,next){try{res.json({data:await cashService.getSession(req.params.id)});}catch(e){next(e);}}
async function open(req,res,next){try{res.status(201).json({data:await cashService.openSession(req.body,req.user)});}catch(e){next(e);}}
async function movement(req,res,next){try{res.status(201).json({data:await cashService.createManualMovement(req.params.id,req.body,req.user)});}catch(e){next(e);}}
async function close(req,res,next){try{res.json({data:await cashService.closeSession(req.params.id,req.body,req.user)});}catch(e){next(e);}}
module.exports={close,createRegister,current,getSession,movement,open,registers,sessions,updateRegister};
