'use strict';
const paymentService = require('../services/paymentService');
async function methods(req,res,next){try{res.json({data:await paymentService.listPaymentMethods()});}catch(e){next(e);}}
async function salePayments(req,res,next){try{res.json({data:await paymentService.getSalePayments(req.params.saleId)});}catch(e){next(e);}}
async function record(req,res,next){try{res.status(201).json({data:await paymentService.recordSalePayments(req.params.saleId,req.body,req.user)});}catch(e){next(e);}}
module.exports={methods,record,salePayments};
