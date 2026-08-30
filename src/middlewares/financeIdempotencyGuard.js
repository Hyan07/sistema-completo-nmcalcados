'use strict';
const { getPool } = require('../config/database');
const { HttpError } = require('../utils/httpError');
const { normalizeSettlement, normalizeReversal } = require('../utils/financeValidation');
const { moneyToCents, parsePositiveId } = require('../utils/cashPaymentValidation');

const activeOperations = new Set();
function sameNullableId(a,b){return Number(a||0)===Number(b||0);}
function assertSettlementDuplicate(existing, allocation, targetId, request, kind) {
  if (!existing) return;
  const targetColumn = kind === 'RECEIPT' ? 'receivable_id' : 'payable_id';
  if (!allocation || Number(allocation[targetColumn]) !== Number(targetId)
      || moneyToCents(existing.amount) !== moneyToCents(request.amount)
      || Number(existing.payment_method_id) !== Number(request.paymentMethodId)
      || !sameNullableId(existing.cash_session_id, request.cashSessionId)) {
    throw new HttpError(409, 'FINANCE_OPERATION_KEY_REUSED', 'A chave da liquidação já foi utilizada com outra conta, valor, forma de pagamento ou caixa.');
  }
}
function assertReversalDuplicate(existing, targetId, request) {
  if (!existing) return;
  if (Number(existing.id) !== Number(targetId) || String(existing.reversal_reason || '') !== String(request.reason || '')) {
    throw new HttpError(409, 'FINANCE_REVERSAL_KEY_REUSED', 'A chave do estorno já foi utilizada com outra operação ou motivo.');
  }
}
function acquireLocalOperationLock(kind,key){
  const name=`${kind}:${key}`;
  if(activeOperations.has(name))return null;
  activeOperations.add(name);
  let released=false;
  return()=>{if(!released){released=true;activeOperations.delete(name);}};
}
async function withOperationLock(req,res,next,{kind,normalize,inspect}){
  let normalized;
  try { normalized = normalize(req.body || {}); } catch (error) { return next(error); }
  const release=acquireLocalOperationLock(kind,normalized.operationKey);
  if(!release)return next(new HttpError(409,'FINANCE_OPERATION_BUSY','Outra requisição com a mesma chave financeira está em processamento.'));
  try {
    await inspect(getPool(), normalized);
    res.once('finish',release); res.once('close',release);
    return next();
  } catch(error){release();return next(error);}
}
function guardReceivableSettlement(req,res,next){
  const id=parsePositiveId(req.params.id,'Conta a receber');
  return withOperationLock(req,res,next,{kind:'receipt',normalize:normalizeSettlement,inspect:async(db,request)=>{
    const [r]=await db.execute('SELECT * FROM receipts WHERE operation_key=? LIMIT 1',[request.operationKey]);
    if(!r[0])return; const [a]=await db.execute('SELECT receivable_id FROM receipt_allocations WHERE receipt_id=? ORDER BY receivable_id',[r[0].id]);
    assertSettlementDuplicate(r[0],a[0],id,request,'RECEIPT');
  }});
}
function guardPayableSettlement(req,res,next){
  const id=parsePositiveId(req.params.id,'Conta a pagar');
  return withOperationLock(req,res,next,{kind:'disbursement',normalize:normalizeSettlement,inspect:async(db,request)=>{
    const [r]=await db.execute('SELECT * FROM disbursements WHERE operation_key=? LIMIT 1',[request.operationKey]);
    if(!r[0])return; const [a]=await db.execute('SELECT payable_id FROM disbursement_allocations WHERE disbursement_id=? ORDER BY payable_id',[r[0].id]);
    assertSettlementDuplicate(r[0],a[0],id,request,'DISBURSEMENT');
  }});
}
function guardReceiptReversal(req,res,next){
  const id=parsePositiveId(req.params.id,'Recebimento');
  return withOperationLock(req,res,next,{kind:'receipt-reversal',normalize:normalizeReversal,inspect:async(db,request)=>{
    const [r]=await db.execute('SELECT id,reversal_reason FROM receipts WHERE reversal_operation_key=? LIMIT 1',[request.operationKey]);
    assertReversalDuplicate(r[0],id,request);
  }});
}
function guardDisbursementReversal(req,res,next){
  const id=parsePositiveId(req.params.id,'Pagamento');
  return withOperationLock(req,res,next,{kind:'disbursement-reversal',normalize:normalizeReversal,inspect:async(db,request)=>{
    const [r]=await db.execute('SELECT id,reversal_reason FROM disbursements WHERE reversal_operation_key=? LIMIT 1',[request.operationKey]);
    assertReversalDuplicate(r[0],id,request);
  }});
}
module.exports={acquireLocalOperationLock,assertReversalDuplicate,assertSettlementDuplicate,guardDisbursementReversal,guardPayableSettlement,guardReceiptReversal,guardReceivableSettlement,sameNullableId};
