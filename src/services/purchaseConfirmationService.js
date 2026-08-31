'use strict';

const { getPool } = require('../config/database');
const purchaseRepository = require('../repositories/purchaseRepository');
const stockService = require('./stockService');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeOperationKey, parsePositiveId, stockOperationKey } = require('../utils/purchaseValidation');

function normalizeNotes(value) {
  const notes = String(value ?? '').trim();
  if (!notes) return 'Confirmação integral da compra.';
  if (notes.length > 500) throw new HttpError(400, 'INVALID_PURCHASE_CONFIRM_NOTES', 'Observações excedem 500 caracteres.');
  return notes;
}

async function confirmPurchase(purchaseId, input, actor) {
  const id = parsePositiveId(purchaseId, 'Compra');
  const operationKey = normalizeOperationKey(input?.operationKey);
  const notes = normalizeNotes(input?.notes);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const purchase = await purchaseRepository.findPurchaseById(id, connection, { forUpdate: true });
    if (!purchase) throw new HttpError(404, 'PURCHASE_NOT_FOUND', 'Compra não encontrada.');

    const duplicateReceipt = await purchaseRepository.findReceiptByOperationKey(operationKey, connection);
    if (duplicateReceipt) {
      if (String(duplicateReceipt.purchase_id) !== String(id)) {
        throw new HttpError(409, 'PURCHASE_CONFIRM_KEY_REUSED', 'A chave desta confirmação já pertence a outra compra.');
      }
      await connection.commit();
      return { receipt: duplicateReceipt, duplicate: true, status: purchase.status };
    }

    if (!['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(purchase.status)) {
      if (purchase.status === 'RECEIVED') {
        throw new HttpError(409, 'PURCHASE_ALREADY_RECEIVED', 'Esta compra já foi totalmente confirmada e recebida.');
      }
      throw new HttpError(409, 'PURCHASE_NOT_CONFIRMABLE', 'Esta compra não pode ser confirmada no status atual.');
    }

    if (purchase.status === 'DRAFT') {
      if (!purchase.supplier_is_active) throw new HttpError(409, 'SUPPLIER_INACTIVE', 'Fornecedor está inativo.');
      if (await purchaseRepository.countActiveItems(id, connection) < 1) {
        throw new HttpError(409, 'PURCHASE_WITHOUT_ITEMS', 'A compra precisa possuir ao menos um item ativo.');
      }
      await purchaseRepository.setPurchaseStatus(id, 'ORDERED', actor.id, connection);
    }

    const items = await purchaseRepository.listPurchaseItems(id, connection);
    const pendingItems = items.filter((item) => item.is_active && Number(item.quantity_pending) > 0);
    if (!pendingItems.length) {
      throw new HttpError(409, 'PURCHASE_WITHOUT_PENDING_ITEMS', 'Não há itens pendentes para entrada no estoque.');
    }

    const receiptId = await purchaseRepository.createReceipt(id, actor.id, operationKey, notes, connection);
    let totalUnits = 0;

    for (const item of pendingItems) {
      const quantity = Number(item.quantity_pending);
      totalUnits += quantity;

      await stockService.applyStockMovement({
        skuId: item.product_sku_id,
        userId: actor.id,
        typeCode: 'PURCHASE_RECEIPT',
        quantity,
        purchaseItemId: item.id,
        reason: `Confirmação da compra #${id}`,
        operationKey: stockOperationKey(operationKey, item.id)
      }, { connection });

      await purchaseRepository.incrementQuantityReceived(item.id, quantity, connection);
      await purchaseRepository.createReceiptItem(receiptId, item.id, quantity, connection);
    }

    await purchaseRepository.setPurchaseStatus(id, 'RECEIVED', actor.id, connection);
    await createAuditLog({
      userId: actor.id,
      actionCode: 'PURCHASE_CONFIRMED_AND_RECEIVED',
      entityType: 'PURCHASE',
      entityId: id,
      newData: {
        receiptId: String(receiptId),
        operationKey,
        itemCount: pendingItems.length,
        totalUnits,
        status: 'RECEIVED'
      }
    }, connection);

    const receipt = await purchaseRepository.getReceiptById(receiptId, connection);
    await connection.commit();
    return { receipt, duplicate: false, status: 'RECEIVED', itemCount: pendingItems.length, totalUnits };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const existing = await purchaseRepository.findReceiptByOperationKey(operationKey);
      if (existing && String(existing.purchase_id) === String(id)) {
        return { receipt: existing, duplicate: true, status: 'RECEIVED' };
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { confirmPurchase };
