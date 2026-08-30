'use strict';

const financeService = require('../services/financeService');

async function summary(req, res, next) { try { res.json({ data: await financeService.getSummary(req.query) }); } catch (error) { next(error); } }
async function flow(req, res, next) { try { res.json({ data: await financeService.getFlow(req.query) }); } catch (error) { next(error); } }
async function categories(req, res, next) { try { res.json({ data: await financeService.listCategories() }); } catch (error) { next(error); } }
async function createCategory(req, res, next) { try { res.status(201).json({ id: await financeService.createCategory(req.body, req.user) }); } catch (error) { next(error); } }
async function updateCategory(req, res, next) { try { await financeService.updateCategory(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function receivables(req, res, next) { try { res.json(await financeService.listReceivables(req.query)); } catch (error) { next(error); } }
async function createReceivable(req, res, next) { try { res.status(201).json({ data: await financeService.createManualReceivable(req.body, req.user) }); } catch (error) { next(error); } }
async function receiveReceivable(req, res, next) { try { res.json({ data: await financeService.receiveReceivable(req.params.id, req.body, req.user) }); } catch (error) { next(error); } }
async function cancelReceivable(req, res, next) { try { await financeService.cancelManualReceivable(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function payables(req, res, next) { try { res.json(await financeService.listPayables(req.query)); } catch (error) { next(error); } }
async function createPayable(req, res, next) { try { res.status(201).json({ data: await financeService.createManualPayable(req.body, req.user) }); } catch (error) { next(error); } }
async function payPayable(req, res, next) { try { res.json({ data: await financeService.payPayable(req.params.id, req.body, req.user) }); } catch (error) { next(error); } }
async function cancelPayable(req, res, next) { try { await financeService.cancelManualPayable(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function transactions(req, res, next) { try { res.json({ data: await financeService.listTransactions(req.query) }); } catch (error) { next(error); } }
async function reverseReceipt(req, res, next) { try { res.json({ data: await financeService.reverseReceipt(req.params.id, req.body, req.user) }); } catch (error) { next(error); } }
async function reverseDisbursement(req, res, next) { try { res.json({ data: await financeService.reverseDisbursement(req.params.id, req.body, req.user) }); } catch (error) { next(error); } }
async function pendingPurchases(req, res, next) { try { res.json({ data: await financeService.listPendingPurchases() }); } catch (error) { next(error); } }
async function financializePurchase(req, res, next) { try { res.json({ data: await financeService.financializePurchase(req.params.id, req.body, req.user) }); } catch (error) { next(error); } }

module.exports = {
  cancelPayable,
  cancelReceivable,
  categories,
  createCategory,
  createPayable,
  createReceivable,
  financializePurchase,
  flow,
  payPayable,
  payables,
  pendingPurchases,
  receivables,
  receiveReceivable,
  reverseDisbursement,
  reverseReceipt,
  summary,
  transactions,
  updateCategory
};
