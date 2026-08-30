'use strict';

const { getPool } = require('../config/database');

const QUANTITY_SQL = 'COALESCE(sb.quantity, 0)';
const ACTIVE_SQL = '(p.is_active = 1 AND pv.is_active = 1 AND ps.is_active = 1)';

function buildItemFilters(filters = {}) {
  const where = [];
  const params = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    where.push('(p.name LIKE ? OR p.internal_code LIKE ? OR ps.sku LIKE ? OR ps.barcode LIKE ? OR c.name LIKE ? OR s.label LIKE ?)');
    params.push(like, like, like, like, like, like);
  }
  switch (filters.status) {
    case 'OUT_OF_STOCK':
      where.push(`${ACTIVE_SQL} AND ${QUANTITY_SQL} = 0`);
      break;
    case 'LOW_STOCK':
      where.push(`${ACTIVE_SQL} AND ${QUANTITY_SQL} > 0 AND ${QUANTITY_SQL} <= ps.minimum_stock`);
      break;
    case 'OK':
      where.push(`${ACTIVE_SQL} AND ${QUANTITY_SQL} > ps.minimum_stock`);
      break;
    case 'INACTIVE_WITH_STOCK':
      where.push(`NOT ${ACTIVE_SQL} AND ${QUANTITY_SQL} > 0`);
      break;
    case 'INACTIVE':
      where.push(`NOT ${ACTIVE_SQL}`);
      break;
    default:
      break;
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listStockItems(filters, pagination) {
  const built = buildItemFilters(filters);
  const [rows] = await getPool().execute(`
    SELECT ps.id AS sku_id, ps.sku, ps.barcode, ps.minimum_stock, ps.is_active AS sku_is_active,
           pv.id AS variant_id, pv.is_active AS variant_is_active, c.name AS color_name, c.hex_code,
           s.id AS size_id, s.label AS size_label, s.sort_order,
           p.id AS product_id, p.internal_code, p.name AS product_name, p.is_active AS product_is_active,
           COALESCE(ps.cost_price, p.base_cost_price) AS effective_cost_price,
           COALESCE(ps.sale_price, p.base_sale_price) AS effective_sale_price,
           COALESCE(ps.promotional_price, p.promotional_price) AS effective_promotional_price,
           ${QUANTITY_SQL} AS quantity,
           CASE
             WHEN NOT ${ACTIVE_SQL} THEN CASE WHEN ${QUANTITY_SQL} > 0 THEN 'INACTIVE_WITH_STOCK' ELSE 'INACTIVE' END
             WHEN ${QUANTITY_SQL} = 0 THEN 'OUT_OF_STOCK'
             WHEN ${QUANTITY_SQL} <= ps.minimum_stock THEN 'LOW_STOCK'
             ELSE 'OK'
           END AS stock_status
      FROM product_skus ps
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = ps.size_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id = ps.id
      ${built.sql}
     ORDER BY p.name, c.name, s.sort_order, s.label, ps.id
     LIMIT ? OFFSET ?
  `, [...built.params, pagination.pageSize, pagination.offset]);

  const [countRows] = await getPool().execute(`
    SELECT COUNT(*) AS total
      FROM product_skus ps
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = ps.size_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id = ps.id
      ${built.sql}
  `, built.params);
  return { rows, total: Number(countRows[0].total) };
}

async function getStockSummary() {
  const [rows] = await getPool().query(`
    SELECT COUNT(*) AS total_skus,
           COALESCE(SUM(${QUANTITY_SQL}), 0) AS total_units,
           SUM(CASE WHEN ${ACTIVE_SQL} AND ${QUANTITY_SQL} = 0 THEN 1 ELSE 0 END) AS out_of_stock,
           SUM(CASE WHEN ${ACTIVE_SQL} AND ${QUANTITY_SQL} > 0 AND ${QUANTITY_SQL} <= ps.minimum_stock THEN 1 ELSE 0 END) AS low_stock,
           SUM(CASE WHEN NOT ${ACTIVE_SQL} AND ${QUANTITY_SQL} > 0 THEN 1 ELSE 0 END) AS inactive_with_stock
      FROM product_skus ps
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id = ps.id
  `);
  return rows[0];
}

async function getStockItemById(skuId, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT ps.id AS sku_id, ps.sku, ps.barcode, ps.minimum_stock, ps.is_active AS sku_is_active,
           pv.id AS variant_id, pv.is_active AS variant_is_active, c.name AS color_name,
           s.label AS size_label, p.id AS product_id, p.name AS product_name, p.internal_code,
           p.is_active AS product_is_active, COALESCE(sb.quantity, 0) AS quantity
      FROM product_skus ps
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = ps.size_id
      LEFT JOIN stock_balances sb ON sb.product_sku_id = ps.id
     WHERE ps.id = ? LIMIT 1
  `, [skuId]);
  return rows[0] || null;
}

async function findPurchaseItemSku(purchaseItemId, connection) {
  const [rows] = await connection.execute('SELECT product_sku_id FROM purchase_items WHERE id = ? LIMIT 1', [purchaseItemId]);
  return rows[0] ? Number(rows[0].product_sku_id) : null;
}

async function findSaleItemSku(saleItemId, connection) {
  const [rows] = await connection.execute('SELECT product_sku_id FROM sale_items WHERE id = ? LIMIT 1', [saleItemId]);
  return rows[0] ? Number(rows[0].product_sku_id) : null;
}

async function hasMovementsForSku(skuId, connection) {
  const [rows] = await connection.execute('SELECT id FROM stock_movements WHERE product_sku_id = ? LIMIT 1', [skuId]);
  return Boolean(rows[0]);
}

async function ensureBalance(skuId, connection) {
  await connection.execute('INSERT IGNORE INTO stock_balances (product_sku_id, quantity) VALUES (?, 0)', [skuId]);
}

async function lockBalance(skuId, connection) {
  const [rows] = await connection.execute('SELECT product_sku_id, quantity FROM stock_balances WHERE product_sku_id = ? FOR UPDATE', [skuId]);
  return rows[0] || null;
}

async function updateBalance(skuId, newQuantity, connection) {
  await connection.execute('UPDATE stock_balances SET quantity = ? WHERE product_sku_id = ?', [newQuantity, skuId]);
}

async function findMovementTypeByCode(code, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute('SELECT id, code, name, direction, is_active FROM stock_movement_types WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}

async function listMovementTypes() {
  const [rows] = await getPool().query('SELECT id, code, name, direction, is_active FROM stock_movement_types WHERE is_active = 1 ORDER BY name, id');
  return rows;
}

async function insertMovement(data, connection) {
  const [result] = await connection.execute(`
    INSERT INTO stock_movements (
      product_sku_id, stock_movement_type_id, purchase_item_id, sale_item_id,
      created_by_user_id, operation_key, previous_quantity, quantity_change,
      new_quantity, reason, happened_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP(3)))
  `, [
    data.skuId, data.movementTypeId, data.purchaseItemId || null, data.saleItemId || null,
    data.userId, data.operationKey, data.previousQuantity, data.quantityChange,
    data.newQuantity, data.reason || null, data.happenedAt || null
  ]);
  return result.insertId;
}

async function findMovementByOperationKey(operationKey, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT sm.id, sm.product_sku_id, sm.operation_key, sm.previous_quantity, sm.quantity_change,
           sm.new_quantity, sm.reason, sm.happened_at, sm.created_at,
           sm.purchase_item_id, sm.sale_item_id, sm.created_by_user_id,
           smt.id AS movement_type_id, smt.code AS type_code, smt.name AS type_name, smt.direction
      FROM stock_movements sm
      JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
     WHERE sm.operation_key = ? LIMIT 1
  `, [operationKey]);
  return rows[0] || null;
}

async function getMovementById(id, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.execute(`
    SELECT sm.id, sm.product_sku_id, sm.operation_key, sm.previous_quantity, sm.quantity_change,
           sm.new_quantity, sm.reason, sm.happened_at, sm.created_at,
           sm.purchase_item_id, sm.sale_item_id, sm.created_by_user_id,
           smt.code AS type_code, smt.name AS type_name, smt.direction
      FROM stock_movements sm
      JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
     WHERE sm.id = ? LIMIT 1
  `, [id]);
  return rows[0] || null;
}

function buildMovementFilters(filters = {}) {
  const where = [];
  const params = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    where.push('(p.name LIKE ? OR ps.sku LIKE ? OR ps.barcode LIKE ? OR c.name LIKE ? OR s.label LIKE ?)');
    params.push(like, like, like, like, like);
  }
  if (filters.skuId) { where.push('sm.product_sku_id = ?'); params.push(filters.skuId); }
  if (filters.typeCode) { where.push('smt.code = ?'); params.push(filters.typeCode); }
  if (filters.dateFrom) { where.push('sm.happened_at >= ?'); params.push(`${filters.dateFrom} 00:00:00`); }
  if (filters.dateTo) { where.push('sm.happened_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${filters.dateTo} 00:00:00`); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listMovements(filters, pagination) {
  const built = buildMovementFilters(filters);
  const [rows] = await getPool().execute(`
    SELECT sm.id, sm.product_sku_id, sm.operation_key, sm.previous_quantity, sm.quantity_change,
           sm.new_quantity, sm.reason, sm.happened_at, sm.purchase_item_id, sm.sale_item_id,
           smt.code AS type_code, smt.name AS type_name, smt.direction,
           ps.sku, ps.barcode, p.name AS product_name, c.name AS color_name, s.label AS size_label,
           u.id AS user_id, u.name AS user_name
      FROM stock_movements sm
      JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
      JOIN product_skus ps ON ps.id = sm.product_sku_id
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = ps.size_id
      JOIN users u ON u.id = sm.created_by_user_id
      ${built.sql}
     ORDER BY sm.happened_at DESC, sm.id DESC
     LIMIT ? OFFSET ?
  `, [...built.params, pagination.pageSize, pagination.offset]);
  const [countRows] = await getPool().execute(`
    SELECT COUNT(*) AS total
      FROM stock_movements sm
      JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
      JOIN product_skus ps ON ps.id = sm.product_sku_id
      JOIN product_variants pv ON pv.id = ps.product_variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = ps.size_id
      ${built.sql}
  `, built.params);
  return { rows, total: Number(countRows[0].total) };
}

module.exports = {
  ensureBalance,
  findMovementByOperationKey,
  findMovementTypeByCode,
  findPurchaseItemSku,
  findSaleItemSku,
  getMovementById,
  getStockItemById,
  getStockSummary,
  hasMovementsForSku,
  insertMovement,
  listMovementTypes,
  listMovements,
  listStockItems,
  lockBalance,
  updateBalance
};
