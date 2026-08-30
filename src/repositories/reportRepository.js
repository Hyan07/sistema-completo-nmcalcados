'use strict';

const { getPool } = require('../config/database');

function like(value){return `%${value}%`;}
function pageArgs(query){return [query.limit,query.offset];}
function documentMask(alias){return `CASE WHEN ${alias}.document IS NULL OR ${alias}.document='' THEN NULL ELSE CONCAT(REPEAT('*',GREATEST(0,CHAR_LENGTH(${alias}.document)-4)),RIGHT(${alias}.document,4)) END`;}

async function sales(query){
  const where=['DATE(COALESCE(sa.sold_at,sa.created_at)) BETWEEN ? AND ?','si.is_active=1'],params=[query.dateFrom,query.dateTo];
  if(query.q){where.push('(sa.sale_number LIKE ? OR COALESCE(c.name,\'\') LIKE ? OR u.name LIKE ? OR si.product_name_snapshot LIKE ? OR si.sku_snapshot LIKE ?)');const l=like(query.q);params.push(l,l,l,l,l);}
  if(query.status){where.push('sa.status=?');params.push(query.status);}
  const w=`WHERE ${where.join(' AND ')}`;
  const [rows]=await getPool().execute(`SELECT si.id,DATE(COALESCE(sa.sold_at,sa.created_at)) sale_date,sa.sale_number,sa.status,u.name seller_name,COALESCE(c.name,'Consumidor não identificado') customer_name,si.product_name_snapshot product_name,si.sku_snapshot sku,COALESCE(si.variant_snapshot,'') variant,si.quantity,si.original_unit_price unit_price,si.discount_amount item_discount,si.line_total FROM sales sa JOIN sale_items si ON si.sale_id=sa.id JOIN users u ON u.id=sa.seller_user_id LEFT JOIN customers c ON c.id=sa.customer_id ${w} ORDER BY COALESCE(sa.sold_at,sa.created_at) DESC,sa.id DESC,si.id LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM sales sa JOIN sale_items si ON si.sale_id=sa.id JOIN users u ON u.id=sa.seller_user_id LEFT JOIN customers c ON c.id=sa.customer_id ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) sales_count,COALESCE(SUM(x.total_amount),0.00) sales_total,COALESCE(SUM(x.units),0) units FROM (SELECT sa.id,MAX(sa.total_amount) total_amount,SUM(si.quantity) units FROM sales sa JOIN sale_items si ON si.sale_id=sa.id JOIN users u ON u.id=sa.seller_user_id LEFT JOIN customers c ON c.id=sa.customer_id ${w} GROUP BY sa.id) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function products(query){
  const where=[],params=[];
  if(query.q){where.push('(p.internal_code LIKE ? OR p.name LIKE ? OR COALESCE(p.model,\'\') LIKE ? OR COALESCE(b.name,\'\') LIKE ? OR COALESCE(cat.name,\'\') LIKE ?)');const l=like(query.q);params.push(l,l,l,l,l);}
  if(query.isActive!==null){where.push('p.is_active=?');params.push(query.isActive?1:0);}
  const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const base=`FROM products p LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN categories cat ON cat.id=p.category_id LEFT JOIN product_variants pv ON pv.product_id=p.id LEFT JOIN product_skus ps ON ps.product_variant_id=pv.id LEFT JOIN stock_balances sb ON sb.product_sku_id=ps.id ${w}`;
  const [rows]=await getPool().execute(`SELECT p.id,p.internal_code,p.name product_name,COALESCE(b.name,'') brand_name,COALESCE(cat.name,'') category_name,COALESCE(p.model,'') model,COUNT(DISTINCT ps.id) sku_count,COALESCE(SUM(sb.quantity),0) stock_units,p.base_cost_price,p.base_sale_price,p.is_active,p.is_catalog_visible ${base} GROUP BY p.id,p.internal_code,p.name,b.name,cat.name,p.model,p.base_cost_price,p.base_sale_price,p.is_active,p.is_catalog_visible ORDER BY p.name,p.id LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM products p LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN categories cat ON cat.id=p.category_id ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) product_count,COALESCE(SUM(sku_count),0) sku_count,COALESCE(SUM(stock_units),0) stock_units,COALESCE(SUM(is_catalog_visible),0) catalog_products FROM (SELECT p.id,COUNT(DISTINCT ps.id) sku_count,COALESCE(SUM(sb.quantity),0) stock_units,MAX(p.is_catalog_visible) is_catalog_visible ${base} GROUP BY p.id) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

function stockDerived(query){
  const where=[],params=[];
  if(query.q){where.push('(p.name LIKE ? OR ps.sku LIKE ? OR COALESCE(ps.barcode,\'\') LIKE ? OR c.name LIKE ? OR sz.label LIKE ?)');const l=like(query.q);params.push(l,l,l,l,l);}
  const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const sql=`SELECT ps.id,ps.sku,p.name product_name,c.name color_name,sz.label size_label,COALESCE(sb.quantity,0) quantity,ps.minimum_stock,CASE WHEN p.is_active=0 OR pv.is_active=0 OR ps.is_active=0 THEN CASE WHEN COALESCE(sb.quantity,0)>0 THEN 'INACTIVE_WITH_STOCK' ELSE 'INACTIVE' END WHEN COALESCE(sb.quantity,0)=0 THEN 'OUT_OF_STOCK' WHEN COALESCE(sb.quantity,0)<=ps.minimum_stock THEN 'LOW_STOCK' ELSE 'OK' END stock_status,COALESCE(ps.cost_price,p.base_cost_price) cost_price,COALESCE(ps.promotional_price,ps.sale_price,p.promotional_price,p.base_sale_price) sale_price,COALESCE(sb.quantity,0)*COALESCE(ps.cost_price,p.base_cost_price) inventory_cost,COALESCE(sb.quantity,0)*COALESCE(ps.promotional_price,ps.sale_price,p.promotional_price,p.base_sale_price) inventory_sale_value FROM product_skus ps JOIN product_variants pv ON pv.id=ps.product_variant_id JOIN products p ON p.id=pv.product_id JOIN colors c ON c.id=pv.color_id JOIN sizes sz ON sz.id=ps.size_id LEFT JOIN stock_balances sb ON sb.product_sku_id=ps.id ${w}`;
  return{sql,params};
}
async function stock(query){
  const d=stockDerived(query),outer=[],params=[...d.params];if(query.stockStatus){outer.push('x.stock_status=?');params.push(query.stockStatus);}const w=outer.length?`WHERE ${outer.join(' AND ')}`:'';
  const [rows]=await getPool().execute(`SELECT * FROM (${d.sql}) x ${w} ORDER BY FIELD(stock_status,'OUT_OF_STOCK','LOW_STOCK','INACTIVE_WITH_STOCK','INACTIVE','OK'),product_name,color_name,size_label LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM (${d.sql}) x ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) sku_count,COALESCE(SUM(quantity),0) stock_units,COALESCE(SUM(inventory_cost),0.00) inventory_cost,COALESCE(SUM(inventory_sale_value),0.00) inventory_sale_value,COALESCE(SUM(stock_status='OUT_OF_STOCK'),0) out_of_stock,COALESCE(SUM(stock_status='LOW_STOCK'),0) low_stock FROM (${d.sql}) x ${w}`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function stockMovements(query){
  const where=['DATE(sm.happened_at) BETWEEN ? AND ?'],params=[query.dateFrom,query.dateTo];
  if(query.q){where.push('(p.name LIKE ? OR ps.sku LIKE ? OR COALESCE(sm.reason,\'\') LIKE ? OR u.name LIKE ?)');const l=like(query.q);params.push(l,l,l,l);}
  if(query.movementType){where.push('smt.code=?');params.push(query.movementType);}
  const w=`WHERE ${where.join(' AND ')}`;
  const joins=`FROM stock_movements sm JOIN stock_movement_types smt ON smt.id=sm.stock_movement_type_id JOIN product_skus ps ON ps.id=sm.product_sku_id JOIN product_variants pv ON pv.id=ps.product_variant_id JOIN products p ON p.id=pv.product_id JOIN colors c ON c.id=pv.color_id JOIN sizes sz ON sz.id=ps.size_id JOIN users u ON u.id=sm.created_by_user_id LEFT JOIN purchase_items pi ON pi.id=sm.purchase_item_id LEFT JOIN purchases pu ON pu.id=pi.purchase_id LEFT JOIN sale_items si ON si.id=sm.sale_item_id LEFT JOIN sales sa ON sa.id=si.sale_id`;
  const [rows]=await getPool().execute(`SELECT sm.id,sm.happened_at,ps.sku,p.name product_name,CONCAT(c.name,' / ',sz.label) grade,smt.name type_name,smt.code type_code,sm.previous_quantity,sm.quantity_change,sm.new_quantity,u.name user_name,COALESCE(CONCAT('Compra ',NULLIF(pu.document_number,'')),CONCAT('Venda ',sa.sale_number),'—') reference,COALESCE(sm.reason,'') reason ${joins} ${w} ORDER BY sm.happened_at DESC,sm.id DESC LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total ${joins} ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) movement_count,COALESCE(SUM(CASE WHEN sm.quantity_change>0 THEN sm.quantity_change ELSE 0 END),0) units_in,COALESCE(SUM(CASE WHEN sm.quantity_change<0 THEN -sm.quantity_change ELSE 0 END),0) units_out ${joins} ${w}`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function purchases(query){
  const where=['pu.purchase_date BETWEEN ? AND ?','pi.is_active=1'],params=[query.dateFrom,query.dateTo];
  if(query.q){where.push('(COALESCE(pu.document_number,\'\') LIKE ? OR COALESCE(s.trade_name,s.legal_name) LIKE ? OR pi.description_snapshot LIKE ? OR pi.sku_snapshot LIKE ?)');const l=like(query.q);params.push(l,l,l,l);}
  if(query.status){where.push('pu.status=?');params.push(query.status);}
  const w=`WHERE ${where.join(' AND ')}`,joins=`FROM purchases pu JOIN suppliers s ON s.id=pu.supplier_id JOIN purchase_items pi ON pi.purchase_id=pu.id`;
  const [rows]=await getPool().execute(`SELECT pi.id,pu.purchase_date,COALESCE(pu.document_number,'—') document_number,COALESCE(s.trade_name,s.legal_name) supplier_name,pu.status,pi.description_snapshot description,pi.sku_snapshot sku,pi.quantity_ordered,pi.quantity_received,(pi.quantity_ordered-pi.quantity_received) quantity_pending,pi.unit_cost,pi.line_total ${joins} ${w} ORDER BY pu.purchase_date DESC,pu.id DESC,pi.id LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total ${joins} ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) purchase_count,COALESCE(SUM(total_amount),0.00) purchase_total,COALESCE(SUM(ordered_units),0) ordered_units,COALESCE(SUM(received_units),0) received_units,COALESCE(SUM(pending_units),0) pending_units FROM (SELECT pu.id,MAX(pu.total_amount) total_amount,SUM(pi.quantity_ordered) ordered_units,SUM(pi.quantity_received) received_units,SUM(pi.quantity_ordered-pi.quantity_received) pending_units ${joins} ${w} GROUP BY pu.id) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function customers(query){
  const where=[],params=[];if(query.q){where.push('(c.name LIKE ? OR COALESCE(c.phone,\'\') LIKE ? OR COALESCE(c.whatsapp,\'\') LIKE ? OR COALESCE(c.email,\'\') LIKE ?)');const l=like(query.q);params.push(l,l,l,l);}if(query.isActive!==null){where.push('c.is_active=?');params.push(query.isActive?1:0);}const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const [rows]=await getPool().execute(`SELECT c.id,c.name customer_name,${documentMask('c')} document_masked,COALESCE(c.phone,'') phone,COALESCE(c.whatsapp,'') whatsapp,COALESCE(c.email,'') email,TRIM(CONCAT_WS('/',NULLIF(c.city,''),NULLIF(c.state,''))) city_state,c.is_active,COUNT(sa.id) sale_count,COALESCE(SUM(sa.total_amount),0.00) total_spent,MAX(sa.sold_at) last_sale_at FROM customers c LEFT JOIN sales sa ON sa.customer_id=c.id AND sa.status='COMPLETED' ${w} GROUP BY c.id,c.name,c.document,c.phone,c.whatsapp,c.email,c.city,c.state,c.is_active ORDER BY c.name,c.id LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM customers c ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) customer_count,COALESCE(SUM(is_active),0) active_customers,COALESCE(SUM(sale_count),0) sale_count,COALESCE(SUM(total_spent),0.00) total_spent FROM (SELECT c.id,c.is_active,COUNT(sa.id) sale_count,COALESCE(SUM(sa.total_amount),0.00) total_spent FROM customers c LEFT JOIN sales sa ON sa.customer_id=c.id AND sa.status='COMPLETED' ${w} GROUP BY c.id,c.is_active) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function suppliers(query){
  const where=[],params=[];if(query.q){where.push('(s.legal_name LIKE ? OR COALESCE(s.trade_name,\'\') LIKE ? OR COALESCE(s.contact_name,\'\') LIKE ? OR COALESCE(s.phone,\'\') LIKE ? OR COALESCE(s.email,\'\') LIKE ?)');const l=like(query.q);params.push(l,l,l,l,l);}if(query.isActive!==null){where.push('s.is_active=?');params.push(query.isActive?1:0);}const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const [rows]=await getPool().execute(`SELECT s.id,COALESCE(s.trade_name,s.legal_name) supplier_name,${documentMask('s')} document_masked,COALESCE(s.contact_name,'') contact_name,COALESCE(s.phone,'') phone,COALESCE(s.email,'') email,TRIM(CONCAT_WS('/',NULLIF(s.city,''),NULLIF(s.state,''))) city_state,s.is_active,COUNT(pu.id) purchase_count,COALESCE(SUM(pu.total_amount),0.00) total_purchased,MAX(pu.purchase_date) last_purchase_date FROM suppliers s LEFT JOIN purchases pu ON pu.supplier_id=s.id AND pu.status<>'CANCELLED' ${w} GROUP BY s.id,s.legal_name,s.trade_name,s.document,s.contact_name,s.phone,s.email,s.city,s.state,s.is_active ORDER BY supplier_name,s.id LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM suppliers s ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) supplier_count,COALESCE(SUM(is_active),0) active_suppliers,COALESCE(SUM(purchase_count),0) purchase_count,COALESCE(SUM(total_purchased),0.00) total_purchased FROM (SELECT s.id,s.is_active,COUNT(pu.id) purchase_count,COALESCE(SUM(pu.total_amount),0.00) total_purchased FROM suppliers s LEFT JOIN purchases pu ON pu.supplier_id=s.id AND pu.status<>'CANCELLED' ${w} GROUP BY s.id,s.is_active) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

async function cash(query){
  const where=['DATE(cs.opened_at) BETWEEN ? AND ?'],params=[query.dateFrom,query.dateTo];if(query.q){where.push('(cr.code LIKE ? OR cr.name LIKE ? OR u.name LIKE ?)');const l=like(query.q);params.push(l,l,l);}if(query.status){where.push('cs.status=?');params.push(query.status);}const w=`WHERE ${where.join(' AND ')}`;
  const base=`FROM cash_sessions cs JOIN cash_registers cr ON cr.id=cs.cash_register_id JOIN users u ON u.id=cs.operator_user_id LEFT JOIN cash_movements cm ON cm.cash_session_id=cs.id LEFT JOIN cash_movement_types cmt ON cmt.id=cm.cash_movement_type_id ${w}`;
  const select=`SELECT cs.id,cs.opened_at,cr.code register_code,cr.name register_name,u.name operator_name,cs.status,cs.opening_balance,COALESCE(SUM(CASE WHEN cmt.direction='IN' THEN cm.amount ELSE 0 END),0.00) cash_in,COALESCE(SUM(CASE WHEN cmt.direction='OUT' THEN cm.amount ELSE 0 END),0.00) cash_out,COALESCE(cs.expected_closing_balance,cs.opening_balance+COALESCE(SUM(CASE cmt.direction WHEN 'IN' THEN cm.amount WHEN 'OUT' THEN -cm.amount ELSE 0 END),0.00)) expected_balance,cs.declared_closing_balance,cs.closing_difference,cs.closed_at ${base} GROUP BY cs.id,cs.opened_at,cr.code,cr.name,u.name,cs.status,cs.opening_balance,cs.expected_closing_balance,cs.declared_closing_balance,cs.closing_difference,cs.closed_at`;
  const [rows]=await getPool().execute(`${select} ORDER BY cs.opened_at DESC,cs.id DESC LIMIT ? OFFSET ?`,[...params,...pageArgs(query)]);
  const [count]=await getPool().execute(`SELECT COUNT(*) total FROM cash_sessions cs JOIN cash_registers cr ON cr.id=cs.cash_register_id JOIN users u ON u.id=cs.operator_user_id ${w}`,params);
  const [summary]=await getPool().execute(`SELECT COUNT(*) session_count,COALESCE(SUM(status='OPEN'),0) open_sessions,COALESCE(SUM(cash_in),0.00) cash_in,COALESCE(SUM(cash_out),0.00) cash_out,COALESCE(SUM(CASE WHEN status='CLOSED' THEN closing_difference ELSE 0 END),0.00) closing_difference FROM (${select}) x`,params);
  return{rows,total:Number(count[0].total),summary:summary[0]};
}

function financeUnion(query){
  const branches=[],params=[];
  function branch(type){
    const isR=type==='RECEIVABLE',a=isR?'r':'p',counter=isR?"COALESCE(c.name,'—')":"COALESCE(s.trade_name,s.legal_name,'—')",join=isR?'LEFT JOIN customers c ON c.id=r.customer_id':'LEFT JOIN suppliers s ON s.id=p.supplier_id';
    const where=[`${a}.due_date BETWEEN ? AND ?`],local=[query.dateFrom,query.dateTo];
    if(query.q){where.push(`(${a}.description LIKE ? OR ${counter} LIKE ? OR COALESCE(fc.name,'') LIKE ?)`);const l=like(query.q);local.push(l,l,l);}if(query.status){where.push(`${a}.status=?`);local.push(query.status);}
    branches.push(`SELECT '${type}' record_type,${a}.id,${a}.due_date,${a}.status,${a}.source_type,${a}.description,${counter} counterparty_name,COALESCE(fc.name,'') category_name,${a}.original_amount,${a}.outstanding_amount,CASE WHEN ${a}.status IN ('OPEN','PARTIAL') AND ${a}.due_date<CURDATE() THEN 1 ELSE 0 END is_overdue,${a}.created_at FROM ${isR?'receivables':'payables'} ${a} ${join} LEFT JOIN financial_categories fc ON fc.id=${a}.financial_category_id WHERE ${where.join(' AND ')}`);params.push(...local);
  }
  if(!query.financeType||query.financeType==='RECEIVABLE')branch('RECEIVABLE');if(!query.financeType||query.financeType==='PAYABLE')branch('PAYABLE');return{sql:branches.join(' UNION ALL '),params};
}
async function finance(query){
  const u=financeUnion(query);const [rows]=await getPool().execute(`SELECT * FROM (${u.sql}) x ORDER BY due_date,status,id LIMIT ? OFFSET ?`,[...u.params,...pageArgs(query)]);const [count]=await getPool().execute(`SELECT COUNT(*) total FROM (${u.sql}) x`,u.params);const [summary]=await getPool().execute(`SELECT COALESCE(SUM(CASE WHEN record_type='RECEIVABLE' AND status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) receivable_open,COALESCE(SUM(CASE WHEN record_type='PAYABLE' AND status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) payable_open,COALESCE(SUM(CASE WHEN record_type='RECEIVABLE' AND is_overdue=1 THEN outstanding_amount ELSE 0 END),0.00) receivable_overdue,COALESCE(SUM(CASE WHEN record_type='PAYABLE' AND is_overdue=1 THEN outstanding_amount ELSE 0 END),0.00) payable_overdue FROM (${u.sql}) x`,u.params);return{rows,total:Number(count[0].total),summary:summary[0]};
}

const handlers={sales,products,stock,'stock-movements':stockMovements,purchases,customers,suppliers,cash,finance};
async function run(reportKey,query){return handlers[reportKey](query);}
module.exports={run};
