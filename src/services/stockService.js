'use strict';

const { getPool } = require('../config/database');
const stockRepository = require('../repositories/stockRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const {
  calculateNewBalance,
  normalizeInventoryCount,
  normalizeManualMovement,
  normalizeOperationKey,
  normalizeReason,
  parseDateFilter,
  parsePagination,
  parsePositiveId,
  parseQuantity,
  stockStatus
} = require('../utils/stockValidation');

function normalizeQueryText(value) { return String(value || '').trim().slice(0, 180); }
function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  const allowed = new Set(['', 'OUT_OF_STOCK', 'LOW_STOCK', 'OK', 'INACTIVE', 'INACTIVE_WITH_STOCK']);
  if (!allowed.has(status)) throw new HttpError(400, 'INVALID_STOCK_STATUS', 'Filtro de status de estoque inválido.');
  return status || null;
}
async function listStockItems(query = {}) {
  const pagination = parsePagination(query);
  const result = await stockRepository.listStockItems({ q: normalizeQueryText(query.q), status: normalizeStatus(query.status) }, pagination);
  return { data: result.rows, pagination: { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pagination.pageSize)) } };
}
async function getSummary() {
  const row = await stockRepository.getStockSummary();
  return { totalSkus: Number(row.total_skus || 0), totalUnits: Number(row.total_units || 0), outOfStock: Number(row.out_of_stock || 0), lowStock: Number(row.low_stock || 0), inactiveWithStock: Number(row.inactive_with_stock || 0) };
}
async function getStockItem(skuId) {
  const id = parsePositiveId(skuId, 'SKU');
  const item = await stockRepository.getStockItemById(id);
  if (!item) throw new HttpError(404, 'SKU_NOT_FOUND', 'SKU não encontrado.');
  const active = Boolean(item.product_is_active && item.variant_is_active && item.sku_is_active);
  return { ...item, stock_status: stockStatus({ quantity: item.quantity, minimumStock: item.minimum_stock, active }) };
}
async function listMovementTypes() { return stockRepository.listMovementTypes(); }
async function listMovements(query = {}) {
  const pagination = parsePagination(query);
  const skuId = query.skuId ? parsePositiveId(query.skuId, 'SKU') : null;
  const typeCode = String(query.typeCode || '').trim().toUpperCase().slice(0, 60) || null;
  const dateFrom = parseDateFilter(query.dateFrom, 'Data inicial');
  const dateTo = parseDateFilter(query.dateTo, 'Data final');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new HttpError(400, 'INVALID_DATE_RANGE', 'A data inicial não pode ser posterior à data final.');
  const result = await stockRepository.listMovements({ q: normalizeQueryText(query.q), skuId, typeCode, dateFrom, dateTo }, pagination);
  return { data: result.rows, pagination: { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pagination.pageSize)) } };
}
function verifyExistingMovement(existing, request) {
  if (String(existing.product_sku_id) !== String(request.skuId) || existing.type_code !== request.typeCode || Math.abs(Number(existing.quantity_change)) !== Number(request.quantity)) {
    throw new HttpError(409, 'OPERATION_KEY_REUSED', 'A chave desta operação já foi utilizada com outros dados.');
  }
  return { movement: existing, duplicate: true };
}
async function applyStockMovement(input, { connection = null } = {}) {
  const request = {
    skuId: parsePositiveId(input.skuId, 'SKU'), userId: parsePositiveId(input.userId, 'Usuário'), typeCode: String(input.typeCode || '').trim().toUpperCase(),
    quantity: parseQuantity(input.quantity), reason: normalizeReason(input.reason, { required: false }), operationKey: normalizeOperationKey(input.operationKey),
    purchaseItemId: input.purchaseItemId ? parsePositiveId(input.purchaseItemId, 'Item de compra') : null,
    saleItemId: input.saleItemId ? parsePositiveId(input.saleItemId, 'Item de venda') : null, happenedAt: input.happenedAt || null
  };
  const ownsConnection = !connection;
  const db = connection || await getPool().getConnection();
  try {
    if (ownsConnection) await db.beginTransaction();
    const existing = await stockRepository.findMovementByOperationKey(request.operationKey, db);
    if (existing) { const result = verifyExistingMovement(existing, request); if (ownsConnection) await db.commit(); return result; }
    const sku = await stockRepository.getStockItemById(request.skuId, db);
    if (!sku) throw new HttpError(404, 'SKU_NOT_FOUND', 'SKU não encontrado.');
    const movementType = await stockRepository.findMovementTypeByCode(request.typeCode, db);
    if (!movementType || !movementType.is_active) throw new HttpError(400, 'MOVEMENT_TYPE_UNAVAILABLE', 'Tipo de movimentação de estoque indisponível.');
    if (!['IN', 'OUT'].includes(movementType.direction)) throw new HttpError(500, 'INVALID_MOVEMENT_DIRECTION', 'Tipo de movimentação sem direção operacional válida.');
    const purchaseTypes = new Set(['PURCHASE_RECEIPT', 'SUPPLIER_RETURN']);
    const saleTypes = new Set(['SALE', 'SALE_CANCEL', 'CUSTOMER_RETURN']);
    if (purchaseTypes.has(request.typeCode) && !request.purchaseItemId) throw new HttpError(400, 'PURCHASE_ITEM_REQUIRED', 'Esta movimentação exige referência ao item de compra.');
    if (saleTypes.has(request.typeCode) && !request.saleItemId) throw new HttpError(400, 'SALE_ITEM_REQUIRED', 'Esta movimentação exige referência ao item de venda.');
    if (request.purchaseItemId) {
      const sourceSkuId = await stockRepository.findPurchaseItemSku(request.purchaseItemId, db);
      if (!sourceSkuId) throw new HttpError(400, 'PURCHASE_ITEM_NOT_FOUND', 'Item de compra não encontrado.');
      if (sourceSkuId !== request.skuId) throw new HttpError(409, 'PURCHASE_ITEM_SKU_MISMATCH', 'O item de compra pertence a outro SKU.');
    }
    if (request.saleItemId) {
      const sourceSkuId = await stockRepository.findSaleItemSku(request.saleItemId, db);
      if (!sourceSkuId) throw new HttpError(400, 'SALE_ITEM_NOT_FOUND', 'Item de venda não encontrado.');
      if (sourceSkuId !== request.skuId) throw new HttpError(409, 'SALE_ITEM_SKU_MISMATCH', 'O item de venda pertence a outro SKU.');
    }
    await stockRepository.ensureBalance(request.skuId, db);
    const balance = await stockRepository.lockBalance(request.skuId, db);
    if (!balance) throw new HttpError(500, 'STOCK_BALANCE_NOT_FOUND', 'Não foi possível inicializar o saldo do SKU.');
    if (request.typeCode === 'INITIAL_BALANCE') {
      const hasHistory = await stockRepository.hasMovementsForSku(request.skuId, db);
      if (Number(balance.quantity) !== 0 || hasHistory) throw new HttpError(409, 'INITIAL_BALANCE_NOT_ALLOWED', 'Saldo inicial só pode ser aplicado a SKU zerado e sem histórico.');
    }
    const calculated = calculateNewBalance(Number(balance.quantity), movementType.direction, request.quantity);
    const movementId = await stockRepository.insertMovement({ skuId: request.skuId, movementTypeId: movementType.id, purchaseItemId: request.purchaseItemId, saleItemId: request.saleItemId, userId: request.userId, operationKey: request.operationKey, previousQuantity: Number(balance.quantity), quantityChange: calculated.quantityChange, newQuantity: calculated.newQuantity, reason: request.reason, happenedAt: request.happenedAt }, db);
    await stockRepository.updateBalance(request.skuId, calculated.newQuantity, db, { movementId });
    await createAuditLog({ userId: request.userId, actionCode: 'STOCK_MOVEMENT_CREATED', entityType: 'STOCK_MOVEMENT', entityId: movementId, newData: { skuId: String(request.skuId), typeCode: request.typeCode, previousQuantity: Number(balance.quantity), quantityChange: calculated.quantityChange, newQuantity: calculated.newQuantity, operationKey: request.operationKey } }, db);
    const movement = await stockRepository.getMovementById(movementId, db);
    if (ownsConnection) await db.commit();
    return { movement, duplicate: false };
  } catch (error) {
    if (ownsConnection) {
      try { await db.rollback(); } catch (_) {}
      if (error.code === 'ER_DUP_ENTRY') { const existing = await stockRepository.findMovementByOperationKey(request.operationKey); if (existing) return verifyExistingMovement(existing, request); }
    }
    throw error;
  } finally { if (ownsConnection) db.release(); }
}
async function createManualMovement(skuId, input, actor) { const normalized = normalizeManualMovement(input); return applyStockMovement({ skuId, userId: actor.id, ...normalized }); }
async function countInventory(skuId, input, actor) {
  const id = parsePositiveId(skuId, 'SKU'), userId = parsePositiveId(actor.id, 'Usuário'), normalized = normalizeInventoryCount(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const existing = await stockRepository.findMovementByOperationKey(normalized.operationKey, connection);
    if (existing) {
      if (String(existing.product_sku_id) !== String(id) || Number(existing.new_quantity) !== normalized.countedQuantity) throw new HttpError(409, 'OPERATION_KEY_REUSED', 'A chave desta contagem já foi utilizada com outros dados.');
      await connection.commit(); return { movement: existing, duplicate: true, changed: true };
    }
    const sku = await stockRepository.getStockItemById(id, connection); if (!sku) throw new HttpError(404, 'SKU_NOT_FOUND', 'SKU não encontrado.');
    await stockRepository.ensureBalance(id, connection); const balance = await stockRepository.lockBalance(id, connection);
    const committedDuplicate = await stockRepository.findMovementByOperationKey(normalized.operationKey, connection);
    if (committedDuplicate) {
      if (String(committedDuplicate.product_sku_id) !== String(id) || Number(committedDuplicate.new_quantity) !== normalized.countedQuantity) throw new HttpError(409, 'OPERATION_KEY_REUSED', 'A chave desta contagem já foi utilizada com outros dados.');
      await connection.commit(); return { movement: committedDuplicate, duplicate: true, changed: true };
    }
    const previous = Number(balance.quantity), difference = normalized.countedQuantity - previous;
    if (difference === 0) {
      await createAuditLog({ userId, actionCode: 'STOCK_COUNT_CONFIRMED', entityType: 'PRODUCT_SKU', entityId: id, newData: { quantity: previous, reason: normalized.reason, operationKey: normalized.operationKey } }, connection);
      await connection.commit(); return { movement: null, duplicate: false, changed: false, quantity: previous };
    }
    const result = await applyStockMovement({ skuId: id, userId, typeCode: difference > 0 ? 'INVENTORY_GAIN' : 'INVENTORY_LOSS', quantity: Math.abs(difference), reason: normalized.reason, operationKey: normalized.operationKey }, { connection });
    await connection.commit(); return { ...result, changed: true };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
module.exports = { applyStockMovement, countInventory, createManualMovement, getStockItem, getSummary, listMovementTypes, listMovements, listStockItems };
