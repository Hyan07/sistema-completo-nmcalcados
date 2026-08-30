'use strict';

const { getPool } = require('../config/database');
const saleRepository = require('../repositories/saleRepository');
const paymentRepository = require('../repositories/paymentRepository');
const stockService = require('./stockService');
const paymentService = require('./paymentService');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { normalizeCancellationReason, normalizeOperationKey, parsePositiveId, stockOperationKey } = require('../utils/saleValidation');

function duplicateCancellation(existing, id) {
  if (String(existing.id) !== String(id)) throw new HttpError(409, 'SALE_CANCELLATION_KEY_REUSED', 'A chave de cancelamento já pertence a outra venda.');
  return { saleId: Number(existing.id), duplicate: true, status: existing.status };
}
async function cancelSale(id, input, actor) {
  id = parsePositiveId(id, 'Venda');
  const key = normalizeOperationKey(input?.operationKey);
  const reason = normalizeCancellationReason(input?.reason);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const duplicate = await saleRepository.findByCancellationKey(key, connection);
    if (duplicate) { const result = duplicateCancellation(duplicate, id); await connection.commit(); return result; }
    const sale = await saleRepository.findSaleForUpdate(id, connection);
    if (!sale) throw new HttpError(404, 'SALE_NOT_FOUND', 'Venda não encontrada.');
    if (sale.status !== 'COMPLETED') throw new HttpError(409, 'SALE_NOT_CANCELLABLE', 'Somente venda concluída e não devolvida pode ser cancelada.');

    if (await paymentRepository.hasUnbatchedAllocations(id, connection)) throw new HttpError(409, 'LEGACY_FINANCIAL_LINKS_REQUIRE_REVIEW', 'Venda possui alocações financeiras sem lote de pagamento e exige revisão financeira.');
    const financial = await paymentService.reverseSalePaymentsWithinTransaction(sale, reason, key, actor.id, connection);
    const items = (await saleRepository.listSaleItems(id, connection)).filter((item) => item.is_active);
    for (const item of items) {
      await stockService.applyStockMovement({
        skuId: item.product_sku_id, userId: actor.id, typeCode: 'SALE_CANCEL', quantity: Number(item.quantity), saleItemId: item.id,
        reason: `Cancelamento da venda ${sale.sale_number}: ${reason}`,
        operationKey: stockOperationKey(key, item.id, 'SALE_CANCEL')
      }, { connection });
    }
    await saleRepository.cancelSale(id, actor.id, reason, key, connection);
    await createAuditLog({ userId: actor.id, actionCode: 'SALE_CANCELLED_WITH_FINANCIAL_REVERSAL', entityType: 'SALE', entityId: id, newData: { saleNumber: sale.sale_number, reason, itemCount: items.length, reversedPaymentBatches: financial.reversedBatches, reversedReceipts: financial.reversedReceipts, operationKey: key } }, connection);
    await connection.commit();
    return { saleId: id, duplicate: false, status: 'CANCELLED', ...financial };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const existing = await saleRepository.findByCancellationKey(key);
      if (existing) return duplicateCancellation(existing, id);
    }
    throw error;
  } finally { connection.release(); }
}

module.exports = { cancelSale };
