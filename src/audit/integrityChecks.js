'use strict';

const CHECKS = [
  {
    code: 'STOCK_NEGATIVE', severity: 'CRITICAL', domain: 'stock',
    description: 'Saldo físico de SKU não pode ser negativo.',
    sql: `SELECT sb.product_sku_id entity_id, sb.quantity actual_quantity
            FROM stock_balances sb
           WHERE sb.quantity < 0
           ORDER BY sb.product_sku_id LIMIT ?`
  },
  {
    code: 'STOCK_BALANCE_LEDGER_MISMATCH', severity: 'CRITICAL', domain: 'stock',
    description: 'Saldo atual deve coincidir com a última movimentação do SKU; SKU sem histórico deve permanecer zerado.',
    sql: `SELECT sb.product_sku_id entity_id, sb.quantity actual_quantity, lm.new_quantity expected_quantity, lm.id movement_id
            FROM stock_balances sb
            LEFT JOIN stock_movements lm ON lm.id = (
              SELECT sm.id FROM stock_movements sm
               WHERE sm.product_sku_id = sb.product_sku_id
               ORDER BY sm.id DESC LIMIT 1
            )
           WHERE (lm.id IS NULL AND sb.quantity <> 0)
              OR (lm.id IS NOT NULL AND sb.quantity <> lm.new_quantity)
           ORDER BY sb.product_sku_id LIMIT ?`
  },
  {
    code: 'STOCK_MOVEMENT_CHAIN_BREAK', severity: 'CRITICAL', domain: 'stock',
    description: 'previous_quantity de cada movimento deve coincidir com new_quantity do movimento anterior do mesmo SKU.',
    sql: `SELECT entity_id, movement_id, previous_quantity, prior_new_quantity
            FROM (
              SELECT sm.product_sku_id entity_id, sm.id movement_id, sm.previous_quantity,
                     LAG(sm.new_quantity) OVER (PARTITION BY sm.product_sku_id ORDER BY sm.id) prior_new_quantity
                FROM stock_movements sm
            ) x
           WHERE prior_new_quantity IS NOT NULL AND previous_quantity <> prior_new_quantity
           ORDER BY entity_id, movement_id LIMIT ?`
  },
  {
    code: 'RESERVATION_EXCEEDS_PHYSICAL', severity: 'CRITICAL', domain: 'catalog',
    description: 'Reservas ativas não podem superar o saldo físico do SKU.',
    sql: `SELECT sr.product_sku_id entity_id, SUM(sr.quantity) reserved_quantity, COALESCE(sb.quantity,0) physical_quantity
            FROM stock_reservations sr
            LEFT JOIN stock_balances sb ON sb.product_sku_id = sr.product_sku_id
           WHERE sr.status='ACTIVE' AND (sr.expires_at IS NULL OR sr.expires_at > CURRENT_TIMESTAMP(3))
           GROUP BY sr.product_sku_id, sb.quantity
          HAVING SUM(sr.quantity) > COALESCE(sb.quantity,0)
           ORDER BY sr.product_sku_id LIMIT ?`
  },
  {
    code: 'CONFIRMED_ORDER_WITHOUT_RESERVATION', severity: 'CRITICAL', domain: 'catalog',
    description: 'Pedido CONFIRMED precisa possuir reserva ativa não expirada.',
    sql: `SELECT co.id entity_id, co.order_number
            FROM catalog_orders co
           WHERE co.status='CONFIRMED'
             AND NOT EXISTS (
               SELECT 1 FROM stock_reservations sr
                WHERE sr.catalog_order_id=co.id AND sr.status='ACTIVE'
                  AND (sr.expires_at IS NULL OR sr.expires_at > CURRENT_TIMESTAMP(3))
             )
           ORDER BY co.id LIMIT ?`
  },
  {
    code: 'CONVERTED_DRAFT_WITHOUT_RESERVATION', severity: 'CRITICAL', domain: 'catalog',
    description: 'Venda DRAFT convertida de pedido deve manter a reserva ativa até a finalização/cancelamento.',
    sql: `SELECT co.id entity_id, co.order_number, co.converted_sale_id
            FROM catalog_orders co
            JOIN sales s ON s.id=co.converted_sale_id
           WHERE co.status='CONVERTED' AND s.status='DRAFT'
             AND NOT EXISTS (SELECT 1 FROM stock_reservations sr WHERE sr.catalog_order_id=co.id AND sr.status='ACTIVE')
           ORDER BY co.id LIMIT ?`
  },
  {
    code: 'COMPLETED_CATALOG_SALE_WITH_ACTIVE_RESERVATION', severity: 'CRITICAL', domain: 'catalog',
    description: 'Reserva de pedido convertido deve estar consumida após a venda ser concluída.',
    sql: `SELECT co.id entity_id, co.order_number, co.converted_sale_id
            FROM catalog_orders co
            JOIN sales s ON s.id=co.converted_sale_id
           WHERE co.status='CONVERTED' AND s.status='COMPLETED'
             AND EXISTS (SELECT 1 FROM stock_reservations sr WHERE sr.catalog_order_id=co.id AND sr.status='ACTIVE')
           ORDER BY co.id LIMIT ?`
  },
  {
    code: 'PURCHASE_RECEIPT_QUANTITY_MISMATCH', severity: 'CRITICAL', domain: 'purchases',
    description: 'quantity_received do item de compra deve coincidir com a soma dos recebimentos imutáveis.',
    sql: `SELECT pi.id entity_id, pi.quantity_received stored_quantity, COALESCE(SUM(pri.quantity_received),0) receipt_quantity
            FROM purchase_items pi
            LEFT JOIN purchase_receipt_items pri ON pri.purchase_item_id=pi.id
           GROUP BY pi.id, pi.quantity_received
          HAVING pi.quantity_received <> COALESCE(SUM(pri.quantity_received),0)
           ORDER BY pi.id LIMIT ?`
  },
  {
    code: 'PURCHASE_STATUS_MISMATCH', severity: 'ERROR', domain: 'purchases',
    description: 'Status de compra deve refletir quantidades recebidas dos itens ativos.',
    sql: `SELECT p.id entity_id, p.status,
                 COALESCE(SUM(CASE WHEN pi.is_active=1 THEN pi.quantity_ordered ELSE 0 END),0) ordered_qty,
                 COALESCE(SUM(CASE WHEN pi.is_active=1 THEN pi.quantity_received ELSE 0 END),0) received_qty
            FROM purchases p
            LEFT JOIN purchase_items pi ON pi.purchase_id=p.id
           WHERE p.status IN ('ORDERED','PARTIALLY_RECEIVED','RECEIVED')
           GROUP BY p.id,p.status
          HAVING (p.status='ORDERED' AND received_qty<>0)
              OR (p.status='PARTIALLY_RECEIVED' AND NOT (received_qty>0 AND received_qty<ordered_qty))
              OR (p.status='RECEIVED' AND received_qty<>ordered_qty)
           ORDER BY p.id LIMIT ?`
  },
  {
    code: 'SALE_COMPLETED_STOCK_MISMATCH', severity: 'CRITICAL', domain: 'sales',
    description: 'Cada item ativo de venda concluída deve possuir baixa SALE equivalente.',
    sql: `SELECT si.id entity_id, si.sale_id, si.quantity sold_quantity,
                 COALESCE(SUM(CASE WHEN smt.code='SALE' THEN ABS(sm.quantity_change) ELSE 0 END),0) movement_quantity
            FROM sale_items si
            JOIN sales s ON s.id=si.sale_id
            LEFT JOIN stock_movements sm ON sm.sale_item_id=si.id
            LEFT JOIN stock_movement_types smt ON smt.id=sm.stock_movement_type_id
           WHERE s.status='COMPLETED' AND si.is_active=1
           GROUP BY si.id,si.sale_id,si.quantity
          HAVING movement_quantity<>si.quantity
           ORDER BY si.id LIMIT ?`
  },
  {
    code: 'SALE_CANCEL_STOCK_MISMATCH', severity: 'CRITICAL', domain: 'sales',
    description: 'Venda cancelada deve possuir estorno SALE_CANCEL equivalente à baixa SALE por item ativo.',
    sql: `SELECT si.id entity_id, si.sale_id,
                 COALESCE(SUM(CASE WHEN smt.code='SALE' THEN ABS(sm.quantity_change) ELSE 0 END),0) sale_qty,
                 COALESCE(SUM(CASE WHEN smt.code='SALE_CANCEL' THEN ABS(sm.quantity_change) ELSE 0 END),0) cancel_qty
            FROM sale_items si
            JOIN sales s ON s.id=si.sale_id
            LEFT JOIN stock_movements sm ON sm.sale_item_id=si.id
            LEFT JOIN stock_movement_types smt ON smt.id=sm.stock_movement_type_id
           WHERE s.status='CANCELLED' AND si.is_active=1
           GROUP BY si.id,si.sale_id
          HAVING sale_qty<>cancel_qty
           ORDER BY si.id LIMIT ?`
  },
  {
    code: 'SALE_OVERALLOCATED', severity: 'CRITICAL', domain: 'payments',
    description: 'Alocações confirmadas de pagamento não podem ultrapassar o total da venda.',
    sql: `SELECT s.id entity_id, s.total_amount,
                 COALESCE(SUM(CASE WHEN spb.status='CONFIRMED' THEN spa.amount ELSE 0 END),0) allocated_amount
            FROM sales s
            LEFT JOIN sale_payment_allocations spa ON spa.sale_id=s.id
            LEFT JOIN sale_payment_batches spb ON spb.id=spa.payment_batch_id
           GROUP BY s.id,s.total_amount
          HAVING allocated_amount>s.total_amount
           ORDER BY s.id LIMIT ?`
  },
  {
    code: 'RECEIPT_ALLOCATION_MISMATCH', severity: 'CRITICAL', domain: 'finance',
    description: 'Valor de recebimento deve coincidir com a soma de suas alocações.',
    sql: `SELECT r.id entity_id, r.amount, COALESCE(SUM(ra.amount),0) allocated_amount
            FROM receipts r LEFT JOIN receipt_allocations ra ON ra.receipt_id=r.id
           GROUP BY r.id,r.amount
          HAVING allocated_amount<>r.amount
           ORDER BY r.id LIMIT ?`
  },
  {
    code: 'DISBURSEMENT_ALLOCATION_MISMATCH', severity: 'CRITICAL', domain: 'finance',
    description: 'Valor de pagamento deve coincidir com a soma de suas alocações.',
    sql: `SELECT d.id entity_id, d.amount, COALESCE(SUM(da.amount),0) allocated_amount
            FROM disbursements d LEFT JOIN disbursement_allocations da ON da.disbursement_id=d.id
           GROUP BY d.id,d.amount
          HAVING allocated_amount<>d.amount
           ORDER BY d.id LIMIT ?`
  },
  {
    code: 'RECEIVABLE_BALANCE_MISMATCH', severity: 'CRITICAL', domain: 'finance',
    description: 'Saldo a receber deve ser original menos recebimentos confirmados alocados.',
    sql: `SELECT r.id entity_id, r.original_amount, r.outstanding_amount,
                 GREATEST(r.original_amount-COALESCE(SUM(CASE WHEN rc.status='CONFIRMED' THEN ra.amount ELSE 0 END),0),0) expected_outstanding
            FROM receivables r
            LEFT JOIN receipt_allocations ra ON ra.receivable_id=r.id
            LEFT JOIN receipts rc ON rc.id=ra.receipt_id
           WHERE r.status<>'CANCELLED'
           GROUP BY r.id,r.original_amount,r.outstanding_amount
          HAVING r.outstanding_amount<>expected_outstanding
           ORDER BY r.id LIMIT ?`
  },
  {
    code: 'PAYABLE_BALANCE_MISMATCH', severity: 'CRITICAL', domain: 'finance',
    description: 'Saldo a pagar deve ser original menos pagamentos confirmados alocados.',
    sql: `SELECT p.id entity_id, p.original_amount, p.outstanding_amount,
                 GREATEST(p.original_amount-COALESCE(SUM(CASE WHEN d.status='CONFIRMED' THEN da.amount ELSE 0 END),0),0) expected_outstanding
            FROM payables p
            LEFT JOIN disbursement_allocations da ON da.payable_id=p.id
            LEFT JOIN disbursements d ON d.id=da.disbursement_id
           WHERE p.status<>'CANCELLED'
           GROUP BY p.id,p.original_amount,p.outstanding_amount
          HAVING p.outstanding_amount<>expected_outstanding
           ORDER BY p.id LIMIT ?`
  },
  {
    code: 'MULTIPLE_OPEN_CASH_REGISTER', severity: 'CRITICAL', domain: 'cash',
    description: 'Um terminal não pode possuir mais de uma sessão de caixa aberta.',
    sql: `SELECT cash_register_id entity_id, COUNT(*) open_sessions
            FROM cash_sessions WHERE status='OPEN'
           GROUP BY cash_register_id HAVING COUNT(*)>1
           ORDER BY cash_register_id LIMIT ?`
  },
  {
    code: 'MULTIPLE_OPEN_CASH_OPERATOR', severity: 'CRITICAL', domain: 'cash',
    description: 'Um operador não pode possuir mais de uma sessão de caixa aberta.',
    sql: `SELECT operator_user_id entity_id, COUNT(*) open_sessions
            FROM cash_sessions WHERE status='OPEN'
           GROUP BY operator_user_id HAVING COUNT(*)>1
           ORDER BY operator_user_id LIMIT ?`
  },
  {
    code: 'CLOSED_CASH_DIFFERENCE_MISMATCH', severity: 'ERROR', domain: 'cash',
    description: 'Diferença gravada no fechamento deve ser declarado menos esperado.',
    sql: `SELECT id entity_id, expected_closing_balance, declared_closing_balance, closing_difference,
                 declared_closing_balance-expected_closing_balance expected_difference
            FROM cash_sessions
           WHERE status='CLOSED'
             AND (expected_closing_balance IS NULL OR declared_closing_balance IS NULL OR closing_difference IS NULL
                  OR closing_difference<>(declared_closing_balance-expected_closing_balance))
           ORDER BY id LIMIT ?`
  },
  {
    code: 'APPLIED_IMPORT_WITH_INVALID_COUNTS', severity: 'ERROR', domain: 'imports',
    description: 'Lote aplicado precisa ter zero linhas inválidas e todas as linhas válidas.',
    sql: `SELECT id entity_id, import_type, row_count, valid_rows, invalid_rows
            FROM data_import_batches
           WHERE status='APPLIED' AND (invalid_rows<>0 OR valid_rows<>row_count)
           ORDER BY id LIMIT ?`
  }
];

const VALID_SEVERITIES = new Set(['CRITICAL','ERROR','WARNING']);
function validateCheckDefinition(check) {
  if (!check || !/^[A-Z0-9_]{3,80}$/.test(check.code || '')) return false;
  if (!VALID_SEVERITIES.has(check.severity)) return false;
  if (!String(check.domain || '').trim() || !String(check.description || '').trim()) return false;
  if (!/^\s*SELECT\b/i.test(check.sql || '')) return false;
  if (!/LIMIT \?\s*$/i.test(String(check.sql || '').trim())) return false;
  return true;
}

module.exports = { CHECKS, validateCheckDefinition };
