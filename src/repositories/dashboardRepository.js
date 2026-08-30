'use strict';

const { getPool } = require('../config/database');

function periodParams(period) {
  return [`${period.dateFrom} 00:00:00`, `${period.dateTo} 23:59:59.999`];
}

async function getSalesOverview(period) {
  const [from, to] = periodParams(period);
  const [rows] = await getPool().execute(`
    SELECT COUNT(*) AS sales_count,
           COALESCE(SUM(s.total_amount),0.00) AS revenue,
           COALESCE(AVG(s.total_amount),0.00) AS average_ticket,
           COALESCE(SUM(COALESCE(items.units,0)),0) AS units_sold
      FROM sales s
      LEFT JOIN (SELECT sale_id,SUM(quantity) AS units FROM sale_items WHERE is_active=1 GROUP BY sale_id) items ON items.sale_id=s.id
     WHERE s.status='COMPLETED' AND s.sold_at BETWEEN ? AND ?
  `, [from, to]);
  return rows[0];
}

async function getSalesTrend(period) {
  const [from, to] = periodParams(period);
  const [rows] = await getPool().execute(`
    SELECT DATE_FORMAT(s.sold_at,'%Y-%m-%d') AS day,
           COUNT(*) AS sales_count,
           COALESCE(SUM(s.total_amount),0.00) AS revenue,
           COALESCE(SUM(si.units),0) AS units_sold
      FROM sales s
      LEFT JOIN (SELECT sale_id,SUM(quantity) AS units FROM sale_items WHERE is_active=1 GROUP BY sale_id) si ON si.sale_id=s.id
     WHERE s.status='COMPLETED' AND s.sold_at BETWEEN ? AND ?
     GROUP BY DATE(s.sold_at)
     ORDER BY DATE(s.sold_at)
  `, [from, to]);
  return rows;
}

async function getTopProducts(period, limit = 10) {
  const [from, to] = periodParams(period);
  const [rows] = await getPool().execute(`
    SELECT p.id AS product_id,
           MAX(si.product_name_snapshot) AS product_name,
           COALESCE(SUM(si.quantity),0) AS units_sold,
           COALESCE(SUM(si.line_total),0.00) AS revenue
      FROM sales s
      JOIN sale_items si ON si.sale_id=s.id AND si.is_active=1
      JOIN product_skus ps ON ps.id=si.product_sku_id
      JOIN product_variants pv ON pv.id=ps.product_variant_id
      JOIN products p ON p.id=pv.product_id
     WHERE s.status='COMPLETED' AND s.sold_at BETWEEN ? AND ?
     GROUP BY p.id
     ORDER BY units_sold DESC,revenue DESC,p.id
     LIMIT ?
  `, [from, to, limit]);
  return rows;
}

async function getPaymentMix(period) {
  const [from, to] = periodParams(period);
  const [rows] = await getPool().execute(`
    SELECT pm.code,pm.name,COALESCE(SUM(spa.amount),0.00) AS amount
      FROM sale_payment_allocations spa
      JOIN sales s ON s.id=spa.sale_id
      JOIN payment_methods pm ON pm.id=spa.payment_method_id
      LEFT JOIN sale_payment_batches spb ON spb.id=spa.payment_batch_id
     WHERE s.status='COMPLETED'
       AND s.sold_at BETWEEN ? AND ?
       AND (spa.payment_batch_id IS NULL OR spb.status='CONFIRMED')
     GROUP BY pm.id,pm.code,pm.name,pm.sort_order
     ORDER BY amount DESC,pm.sort_order,pm.name
  `, [from, to]);
  return rows;
}

async function getStockOverview() {
  const [rows] = await getPool().query(`
    SELECT COUNT(*) AS active_skus,
           COALESCE(SUM(COALESCE(sb.quantity,0)),0) AS units_in_stock,
           COALESCE(SUM(COALESCE(sb.quantity,0) * COALESCE(ps.cost_price,p.base_cost_price,0)),0.00) AS stock_cost_value,
           COALESCE(SUM(COALESCE(sb.quantity,0) * COALESCE(ps.sale_price,p.base_sale_price,0)),0.00) AS stock_sale_value,
           SUM(CASE WHEN COALESCE(sb.quantity,0)=0 THEN 1 ELSE 0 END) AS out_of_stock_skus,
           SUM(CASE WHEN COALESCE(sb.quantity,0)>0 AND ps.minimum_stock>0 AND COALESCE(sb.quantity,0)<=ps.minimum_stock THEN 1 ELSE 0 END) AS low_stock_skus
      FROM product_skus ps
      JOIN product_variants pv ON pv.id=ps.product_variant_id AND pv.is_active=1
      JOIN products p ON p.id=pv.product_id AND p.is_active=1
      LEFT JOIN stock_balances sb ON sb.product_sku_id=ps.id
     WHERE ps.is_active=1
  `);
  return rows[0];
}

async function getLowStockItems(limit = 10) {
  const [rows] = await getPool().execute(`
    SELECT ps.id AS sku_id,ps.sku,p.name AS product_name,c.name AS color_name,sz.label AS size_label,
           COALESCE(sb.quantity,0) AS quantity,ps.minimum_stock,
           CASE WHEN COALESCE(sb.quantity,0)=0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS stock_status
      FROM product_skus ps
      JOIN product_variants pv ON pv.id=ps.product_variant_id AND pv.is_active=1
      JOIN products p ON p.id=pv.product_id AND p.is_active=1
      JOIN colors c ON c.id=pv.color_id
      JOIN sizes sz ON sz.id=ps.size_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id=ps.id
     WHERE ps.is_active=1
       AND (COALESCE(sb.quantity,0)=0 OR (ps.minimum_stock>0 AND COALESCE(sb.quantity,0)<=ps.minimum_stock))
     ORDER BY COALESCE(sb.quantity,0)=0 DESC,(ps.minimum_stock-COALESCE(sb.quantity,0)) DESC,p.name,c.name,sz.sort_order,sz.label
     LIMIT ?
  `, [limit]);
  return rows;
}

async function getPurchasesOverview() {
  const [rows] = await getPool().query(`
    SELECT
      (SELECT COUNT(*) FROM purchases WHERE status IN ('ORDERED','PARTIALLY_RECEIVED')) AS pending_purchases,
      (SELECT COALESCE(SUM(total_amount),0.00) FROM purchases WHERE status IN ('ORDERED','PARTIALLY_RECEIVED')) AS pending_purchase_value,
      (SELECT COALESCE(SUM(GREATEST(pi.quantity_ordered-pi.quantity_received,0)),0)
         FROM purchase_items pi
         JOIN purchases p ON p.id=pi.purchase_id
        WHERE pi.is_active=1 AND p.status IN ('ORDERED','PARTIALLY_RECEIVED')) AS pending_units
  `);
  return rows[0];
}

async function getFinanceOverview(period) {
  const [from, to] = periodParams(period);
  const [r] = await getPool().query(`
    SELECT COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) AS receivable_open,
           COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') AND due_date<CURDATE() THEN outstanding_amount ELSE 0 END),0.00) AS receivable_overdue
      FROM receivables
  `);
  const [p] = await getPool().query(`
    SELECT COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN outstanding_amount ELSE 0 END),0.00) AS payable_open,
           COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIAL') AND due_date<CURDATE() THEN outstanding_amount ELSE 0 END),0.00) AS payable_overdue
      FROM payables
  `);
  const [flow] = await getPool().execute(`
    SELECT
      (SELECT COALESCE(SUM(amount),0.00) FROM receipts WHERE status='CONFIRMED' AND received_at BETWEEN ? AND ?) AS receipts,
      (SELECT COALESCE(SUM(amount),0.00) FROM disbursements WHERE status='CONFIRMED' AND paid_at BETWEEN ? AND ?) AS disbursements
  `, [from, to, from, to]);
  return { ...r[0], ...p[0], ...flow[0] };
}

async function getOpenCashOverview() {
  const [rows] = await getPool().query(`
    SELECT COUNT(*) AS open_sessions,
           COALESCE(SUM(x.expected_balance),0.00) AS expected_cash_total
      FROM (
        SELECT cs.id,cs.opening_balance + COALESCE(SUM(CASE cmt.direction WHEN 'IN' THEN cm.amount WHEN 'OUT' THEN -cm.amount ELSE 0 END),0.00) AS expected_balance
          FROM cash_sessions cs
          LEFT JOIN cash_movements cm ON cm.cash_session_id=cs.id
          LEFT JOIN cash_movement_types cmt ON cmt.id=cm.cash_movement_type_id
         WHERE cs.status='OPEN'
         GROUP BY cs.id,cs.opening_balance
      ) x
  `);
  return rows[0];
}

async function getRecentSales(limit = 8) {
  const [rows] = await getPool().execute(`
    SELECT s.id,s.sale_number,s.total_amount,s.sold_at,c.name AS customer_name,u.name AS seller_name,
           COALESCE(items.units,0) AS units
      FROM sales s
      JOIN users u ON u.id=s.seller_user_id
      LEFT JOIN customers c ON c.id=s.customer_id
      LEFT JOIN (SELECT sale_id,SUM(quantity) units FROM sale_items WHERE is_active=1 GROUP BY sale_id) items ON items.sale_id=s.id
     WHERE s.status='COMPLETED'
     ORDER BY s.sold_at DESC,s.id DESC
     LIMIT ?
  `, [limit]);
  return rows;
}

async function getCashDifferences() {
  const [rows] = await getPool().query(`
    SELECT COUNT(*) AS sessions_with_difference,
           COALESCE(SUM(ABS(closing_difference)),0.00) AS absolute_difference
      FROM cash_sessions
     WHERE status='CLOSED' AND closed_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) AND closing_difference<>0
  `);
  return rows[0];
}

module.exports = {
  getCashDifferences,
  getFinanceOverview,
  getLowStockItems,
  getOpenCashOverview,
  getPaymentMix,
  getPurchasesOverview,
  getRecentSales,
  getSalesOverview,
  getSalesTrend,
  getStockOverview,
  getTopProducts
};
