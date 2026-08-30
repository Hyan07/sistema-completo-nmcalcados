'use strict';

const { getPool } = require('../config/database');
function db(connection) { return connection || getPool(); }

async function listCategories() {
  const [rows] = await getPool().query(`SELECT fc.id,fc.parent_id,fc.type,fc.code,fc.name,fc.is_active,parent.name AS parent_name FROM financial_categories fc LEFT JOIN financial_categories parent ON parent.id=fc.parent_id ORDER BY fc.type,fc.is_active DESC,fc.name,fc.id`);
  return rows;
}
async function findCategoryById(id, connection = null, { forUpdate = false } = {}) {
  const [rows] = await db(connection).execute(`SELECT id,parent_id,type,code,name,is_active FROM financial_categories WHERE id=?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}
async function getAncestorIds(id, connection = null) {
  const [rows] = await db(connection).execute(`WITH RECURSIVE a AS (SELECT id,parent_id FROM financial_categories WHERE id=? UNION ALL SELECT fc.id,fc.parent_id FROM financial_categories fc JOIN a ON a.parent_id=fc.id) SELECT id FROM a`, [id]);
  return rows.map((row) => Number(row.id));
}
async function categoryHasChildren(id, connection = null) {
  const [rows] = await db(connection).execute('SELECT id FROM financial_categories WHERE parent_id=? AND is_active=1 LIMIT 1', [id]);
  return Boolean(rows[0]);
}
async function categoryInUse(id, connection = null) {
  const [r] = await db(connection).execute('SELECT id FROM receivables WHERE financial_category_id=? LIMIT 1', [id]);
  if (r[0]) return true;
  const [p] = await db(connection).execute('SELECT id FROM payables WHERE financial_category_id=? LIMIT 1', [id]);
  return Boolean(p[0]);
}
async function createCategory(data, connection) {
  const [result] = await connection.execute('INSERT INTO financial_categories(parent_id,type,code,name,is_active) VALUES(?,?,?,?,?)', [data.parentId,data.type,data.code,data.name,data.isActive]);
  return result.insertId;
}
async function updateCategory(id, data, connection) {
  const columns=[], values=[];
  for (const [key,column] of [['parentId','parent_id'],['type','type'],['code','code'],['name','name'],['isActive','is_active']]) {
    if (Object.prototype.hasOwnProperty.call(data,key)) { columns.push(`${column}=?`); values.push(data[key]); }
  }
  if (!columns.length) return;
  values.push(id); await connection.execute(`UPDATE financial_categories SET ${columns.join(',')} WHERE id=?`, values);
}
async function findCustomerById(id, connection = null) { const [rows]=await db(connection).execute('SELECT id,name,is_active FROM customers WHERE id=? LIMIT 1',[id]); return rows[0]||null; }
async function findSupplierById(id, connection = null) { const [rows]=await db(connection).execute('SELECT id,legal_name,trade_name,is_active FROM suppliers WHERE id=? LIMIT 1',[id]); return rows[0]||null; }

function commonFilters(alias, filters, kind) {
  const where=[], params=[];
  if (filters.q) {
    const like=`%${filters.q}%`;
    if (kind==='R') { where.push(`(${alias}.description LIKE ? OR c.name LIKE ? OR s.sale_number LIKE ?)`); params.push(like,like,like); }
    else { where.push(`(${alias}.description LIKE ? OR COALESCE(sup.trade_name,sup.legal_name) LIKE ? OR pu.document_number LIKE ?)`); params.push(like,like,like); }
  }
  if (filters.status) { where.push(`${alias}.status=?`); params.push(filters.status); }
  if (filters.sourceType) { where.push(`${alias}.source_type=?`); params.push(filters.sourceType); }
  if (filters.overdue) where.push(`${alias}.status IN ('OPEN','PARTIAL') AND ${alias}.due_date<CURDATE()`);
  if (filters.dateFrom) { where.push(`${alias}.due_date>=?`); params.push(filters.dateFrom); }
  if (filters.dateTo) { where.push(`${alias}.due_date<=?`); params.push(filters.dateTo); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}
async function listReceivables(filters, pagination) {
  const f=commonFilters('r',filters,'R');
  const [rows]=await getPool().execute(`SELECT r.id,r.sale_id,r.customer_id,r.financial_category_id,r.source_type,r.installment_number,r.description,r.due_date,r.original_amount,r.outstanding_amount,r.status,r.operation_key,r.created_at,r.updated_at,CASE WHEN r.status IN ('OPEN','PARTIAL') AND r.due_date<CURDATE() THEN 1 ELSE 0 END AS is_overdue,c.name AS customer_name,s.sale_number,fc.code AS category_code,fc.name AS category_name FROM receivables r LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN sales s ON s.id=r.sale_id LEFT JOIN financial_categories fc ON fc.id=r.financial_category_id ${f.sql} ORDER BY FIELD(r.status,'OPEN','PARTIAL','PAID','CANCELLED'),r.due_date,r.id LIMIT ? OFFSET ?`,[...f.params,pagination.pageSize,pagination.offset]);
  const [count]=await getPool().execute(`SELECT COUNT(*) AS total FROM receivables r LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN sales s ON s.id=r.sale_id ${f.sql}`,f.params);
  return {rows,total:Number(count[0].total)};
}
async function listPayables(filters, pagination) {
  const f=commonFilters('p',filters,'P');
  const [rows]=await getPool().execute(`SELECT p.id,p.purchase_id,p.supplier_id,p.financial_category_id,p.source_type,p.installment_number,p.description,p.due_date,p.original_amount,p.outstanding_amount,p.status,p.operation_key,p.created_at,p.updated_at,CASE WHEN p.status IN ('OPEN','PARTIAL') AND p.due_date<CURDATE() THEN 1 ELSE 0 END AS is_overdue,COALESCE(sup.trade_name,sup.legal_name) AS supplier_name,pu.document_number AS purchase_document,fc.code AS category_code,fc.name AS category_name FROM payables p LEFT JOIN suppliers sup ON sup.id=p.supplier_id LEFT JOIN purchases pu ON pu.id=p.purchase_id LEFT JOIN financial_categories fc ON fc.id=p.financial_category_id ${f.sql} ORDER BY FIELD(p.status,'OPEN','PARTIAL','PAID','CANCELLED'),p.due_date,p.id LIMIT ? OFFSET ?`,[...f.params,pagination.pageSize,pagination.offset]);
  const [count]=await getPool().execute(`SELECT COUNT(*) AS total FROM payables p LEFT JOIN suppliers sup ON sup.id=p.supplier_id LEFT JOIN purchases pu ON pu.id=p.purchase_id ${f.sql}`,f.params);
  return {rows,total:Number(count[0].total)};
}
async function findReceivableById(id, connection=null, {forUpdate=false}={}) { const [rows]=await db(connection).execute(`SELECT * FROM receivables WHERE id=?${forUpdate?' FOR UPDATE':''}`,[id]); return rows[0]||null; }
async function findPayableById(id, connection=null, {forUpdate=false}={}) { const [rows]=await db(connection).execute(`SELECT * FROM payables WHERE id=?${forUpdate?' FOR UPDATE':''}`,[id]); return rows[0]||null; }
async function findReceivableByOperationKey(key, connection=null) { const [rows]=await db(connection).execute('SELECT * FROM receivables WHERE operation_key=? LIMIT 1',[key]); return rows[0]||null; }
async function findPayableByOperationKey(key, connection=null) { const [rows]=await db(connection).execute('SELECT * FROM payables WHERE operation_key=? LIMIT 1',[key]); return rows[0]||null; }
async function createManualReceivable(data, actorId, connection) { const [r]=await connection.execute("INSERT INTO receivables(sale_id,sale_payment_allocation_id,customer_id,financial_category_id,source_type,installment_number,description,due_date,original_amount,outstanding_amount,status,created_by_user_id,operation_key) VALUES(NULL,NULL,?,?,'MANUAL',NULL,?,?,?,?, 'OPEN',?,?)",[data.customerId,data.financialCategoryId,data.description,data.dueDate,data.amount,data.amount,actorId,data.operationKey]); return r.insertId; }
async function createManualPayable(data, actorId, connection) { const [r]=await connection.execute("INSERT INTO payables(purchase_id,supplier_id,financial_category_id,source_type,installment_number,description,due_date,original_amount,outstanding_amount,status,created_by_user_id,operation_key) VALUES(NULL,?,?,'MANUAL',NULL,?,?,?,?, 'OPEN',?,?)",[data.supplierId,data.financialCategoryId,data.description,data.dueDate,data.amount,data.amount,actorId,data.operationKey]); return r.insertId; }
async function updateReceivableBalance(id,outstanding,status,connection){await connection.execute('UPDATE receivables SET outstanding_amount=?,status=? WHERE id=?',[outstanding,status,id]);}
async function updatePayableBalance(id,outstanding,status,connection){await connection.execute('UPDATE payables SET outstanding_amount=?,status=? WHERE id=?',[outstanding,status,id]);}
async function cancelManualReceivable(id,actorId,reason,connection){await connection.execute("UPDATE receivables SET status='CANCELLED',outstanding_amount=0.00,cancelled_by_user_id=?,cancelled_at=CURRENT_TIMESTAMP(3),cancellation_reason=? WHERE id=?",[actorId,reason,id]);}
async function cancelManualPayable(id,actorId,reason,connection){await connection.execute("UPDATE payables SET status='CANCELLED',outstanding_amount=0.00,cancelled_by_user_id=?,cancelled_at=CURRENT_TIMESTAMP(3),cancellation_reason=? WHERE id=?",[actorId,reason,id]);}

async function findReceiptByOperationKey(key, connection=null){const [rows]=await db(connection).execute('SELECT * FROM receipts WHERE operation_key=? LIMIT 1',[key]);return rows[0]||null;}
async function findReceiptByReversalKey(key, connection=null){const [rows]=await db(connection).execute('SELECT * FROM receipts WHERE reversal_operation_key=? LIMIT 1',[key]);return rows[0]||null;}
async function createReceipt(data,connection){const [r]=await connection.execute("INSERT INTO receipts(customer_id,payment_method_id,cash_session_id,received_by_user_id,operation_key,amount,status,received_at,notes) VALUES(?,?,?,?,?,?,'CONFIRMED',CURRENT_TIMESTAMP(3),?)",[data.customerId,data.paymentMethodId,data.cashSessionId,data.userId,data.operationKey,data.amount,data.notes]);return r.insertId;}
async function allocateReceipt(receiptId,receivableId,amount,connection){await connection.execute('INSERT INTO receipt_allocations(receipt_id,receivable_id,amount) VALUES(?,?,?)',[receiptId,receivableId,amount]);}
async function getReceiptForUpdate(id,connection){const [rows]=await connection.execute(`SELECT rc.*,pm.code AS payment_method_code,pm.name AS payment_method_name,pm.requires_cash_session FROM receipts rc JOIN payment_methods pm ON pm.id=rc.payment_method_id WHERE rc.id=? FOR UPDATE`,[id]);return rows[0]||null;}
async function listReceiptAllocationsForUpdate(id,connection){const [rows]=await connection.execute('SELECT ra.* FROM receipt_allocations ra WHERE ra.receipt_id=? ORDER BY ra.receivable_id FOR UPDATE',[id]);return rows;}
async function reverseReceipt(id,actorId,reason,key,connection){await connection.execute("UPDATE receipts SET status='REVERSED',reversed_at=CURRENT_TIMESTAMP(3),reversed_by_user_id=?,reversal_reason=?,reversal_operation_key=? WHERE id=? AND status='CONFIRMED'",[actorId,reason,key,id]);}

async function findDisbursementByOperationKey(key,connection=null){const [rows]=await db(connection).execute('SELECT * FROM disbursements WHERE operation_key=? LIMIT 1',[key]);return rows[0]||null;}
async function findDisbursementByReversalKey(key,connection=null){const [rows]=await db(connection).execute('SELECT * FROM disbursements WHERE reversal_operation_key=? LIMIT 1',[key]);return rows[0]||null;}
async function createDisbursement(data,connection){const [r]=await connection.execute("INSERT INTO disbursements(supplier_id,financial_category_id,payment_method_id,cash_session_id,paid_by_user_id,operation_key,amount,status,paid_at,notes) VALUES(?,?,?,?,?,?,?,'CONFIRMED',CURRENT_TIMESTAMP(3),?)",[data.supplierId,data.financialCategoryId,data.paymentMethodId,data.cashSessionId,data.userId,data.operationKey,data.amount,data.notes]);return r.insertId;}
async function allocateDisbursement(disbursementId,payableId,amount,connection){await connection.execute('INSERT INTO disbursement_allocations(disbursement_id,payable_id,amount) VALUES(?,?,?)',[disbursementId,payableId,amount]);}
async function getDisbursementForUpdate(id,connection){const [rows]=await connection.execute(`SELECT d.*,pm.code AS payment_method_code,pm.name AS payment_method_name,pm.requires_cash_session FROM disbursements d JOIN payment_methods pm ON pm.id=d.payment_method_id WHERE d.id=? FOR UPDATE`,[id]);return rows[0]||null;}
async function listDisbursementAllocationsForUpdate(id,connection){const [rows]=await connection.execute('SELECT da.* FROM disbursement_allocations da WHERE da.disbursement_id=? ORDER BY da.payable_id FOR UPDATE',[id]);return rows;}
async function reverseDisbursement(id,actorId,reason,key,connection){await connection.execute("UPDATE disbursements SET status='REVERSED',reversed_at=CURRENT_TIMESTAMP(3),reversed_by_user_id=?,reversal_reason=?,reversal_operation_key=? WHERE id=? AND status='CONFIRMED'",[actorId,reason,key,id]);}

async function listTransactions({dateFrom=null,dateTo=null}={}){
  const rw=["rc.status IN ('CONFIRMED','REVERSED')"],dw=["d.status IN ('CONFIRMED','REVERSED')"],rp=[],dp=[];
  if(dateFrom){rw.push('DATE(rc.received_at)>=?');dw.push('DATE(d.paid_at)>=?');rp.push(dateFrom);dp.push(dateFrom);} if(dateTo){rw.push('DATE(rc.received_at)<=?');dw.push('DATE(d.paid_at)<=?');rp.push(dateTo);dp.push(dateTo);}
  const [rows]=await getPool().execute(`SELECT * FROM (SELECT 'RECEIPT' transaction_type,rc.id,rc.amount,rc.status,rc.received_at happened_at,rc.cash_session_id,rc.operation_key,rc.reversal_operation_key,rc.reversal_reason,pm.code payment_method_code,pm.name payment_method_name,c.name counterparty_name,u.name user_name,rc.notes FROM receipts rc JOIN payment_methods pm ON pm.id=rc.payment_method_id LEFT JOIN customers c ON c.id=rc.customer_id JOIN users u ON u.id=rc.received_by_user_id WHERE ${rw.join(' AND ')} UNION ALL SELECT 'DISBURSEMENT',d.id,d.amount,d.status,d.paid_at,d.cash_session_id,d.operation_key,d.reversal_operation_key,d.reversal_reason,pm.code,pm.name,COALESCE(s.trade_name,s.legal_name),u.name,d.notes FROM disbursements d JOIN payment_methods pm ON pm.id=d.payment_method_id LEFT JOIN suppliers s ON s.id=d.supplier_id JOIN users u ON u.id=d.paid_by_user_id WHERE ${dw.join(' AND ')}) x ORDER BY happened_at DESC,id DESC LIMIT 200`,[...rp,...dp]);
  return rows;
}
async function getSummary(){
  const [r]=await getPool().query("SELECT COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) receivable_open,COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') AND due_date<CURDATE() THEN outstanding_amount ELSE 0 END),0.00) receivable_overdue FROM receivables");
  const [p]=await getPool().query("SELECT COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) payable_open,COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') AND due_date<CURDATE() THEN outstanding_amount ELSE 0 END),0.00) payable_overdue FROM payables");
  const [rc]=await getPool().query("SELECT COALESCE(SUM(CASE WHEN status='CONFIRMED' AND DATE(received_at)=CURDATE() THEN amount ELSE 0 END),0.00) receipts_today FROM receipts");
  const [d]=await getPool().query("SELECT COALESCE(SUM(CASE WHEN status='CONFIRMED' AND DATE(paid_at)=CURDATE() THEN amount ELSE 0 END),0.00) disbursements_today FROM disbursements");
  return {...r[0],...p[0],...rc[0],...d[0]};
}
async function getFlow({dateFrom=null,dateTo=null}={}){
  const rw=["status='CONFIRMED'"],dw=["status='CONFIRMED'"],rp=[],dp=[];
  if(dateFrom){rw.push('DATE(received_at)>=?');dw.push('DATE(paid_at)>=?');rp.push(dateFrom);dp.push(dateFrom);}if(dateTo){rw.push('DATE(received_at)<=?');dw.push('DATE(paid_at)<=?');rp.push(dateTo);dp.push(dateTo);}
  const [rows]=await getPool().execute(`SELECT day,SUM(inflow) inflow,SUM(outflow) outflow,SUM(inflow)-SUM(outflow) net FROM (SELECT DATE(received_at) day,amount inflow,0.00 outflow FROM receipts WHERE ${rw.join(' AND ')} UNION ALL SELECT DATE(paid_at),0.00,amount FROM disbursements WHERE ${dw.join(' AND ')}) f GROUP BY day ORDER BY day`,[...rp,...dp]);return rows;
}
async function findPurchaseForUpdate(id,connection){const [rows]=await connection.execute(`SELECT p.*,COALESCE(s.trade_name,s.legal_name) supplier_name FROM purchases p JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=? FOR UPDATE`,[id]);return rows[0]||null;}
async function findPurchaseByFinancializationKey(key,connection=null){const [rows]=await db(connection).execute('SELECT * FROM purchases WHERE financialization_operation_key=? LIMIT 1',[key]);return rows[0]||null;}
async function listPendingPurchaseFinancialization(){const [rows]=await getPool().query("SELECT p.id,p.document_number,p.purchase_date,p.received_at,p.total_amount,p.supplier_id,COALESCE(s.trade_name,s.legal_name) supplier_name FROM purchases p JOIN suppliers s ON s.id=p.supplier_id WHERE p.status='RECEIVED' AND p.financialized_at IS NULL AND p.total_amount>0 ORDER BY p.received_at,p.id LIMIT 100");return rows;}
async function listPurchasePayables(purchaseId,connection=null){const [rows]=await db(connection).execute("SELECT id,installment_number,due_date,original_amount,outstanding_amount,status,operation_key FROM payables WHERE purchase_id=? AND source_type='PURCHASE' ORDER BY installment_number,id",[purchaseId]);return rows;}
async function findCategoryByCode(code,connection=null){const [rows]=await db(connection).execute('SELECT id,type,code,name,is_active FROM financial_categories WHERE code=? LIMIT 1',[code]);return rows[0]||null;}
async function createPurchasePayable(data,actorId,connection){const [r]=await connection.execute("INSERT INTO payables(purchase_id,supplier_id,financial_category_id,source_type,installment_number,description,due_date,original_amount,outstanding_amount,status,created_by_user_id,operation_key) VALUES(?,?,?,'PURCHASE',?,?,?,?,?,'OPEN',?,?)",[data.purchaseId,data.supplierId,data.financialCategoryId,data.installmentNumber,data.description,data.dueDate,data.amount,data.amount,actorId,data.operationKey]);return r.insertId;}
async function markPurchaseFinancialized(id,actorId,key,connection){await connection.execute('UPDATE purchases SET financialized_at=CURRENT_TIMESTAMP(3),financialized_by_user_id=?,financialization_operation_key=?,updated_by_user_id=? WHERE id=?',[actorId,key,actorId,id]);}

module.exports={allocateDisbursement,allocateReceipt,cancelManualPayable,cancelManualReceivable,categoryHasChildren,categoryInUse,createCategory,createDisbursement,createManualPayable,createManualReceivable,createPurchasePayable,createReceipt,findCategoryByCode,findCategoryById,findCustomerById,findDisbursementByOperationKey,findDisbursementByReversalKey,findPayableById,findPayableByOperationKey,findPurchaseByFinancializationKey,findPurchaseForUpdate,findReceiptByOperationKey,findReceiptByReversalKey,findReceivableById,findReceivableByOperationKey,findSupplierById,getAncestorIds,getDisbursementForUpdate,getFlow,getReceiptForUpdate,getSummary,listCategories,listDisbursementAllocationsForUpdate,listPayables,listPendingPurchaseFinancialization,listPurchasePayables,listReceiptAllocationsForUpdate,listReceivables,listTransactions,markPurchaseFinancialized,reverseDisbursement,reverseReceipt,updateCategory,updatePayableBalance,updateReceivableBalance};
