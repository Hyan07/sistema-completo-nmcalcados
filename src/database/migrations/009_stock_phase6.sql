ALTER TABLE stock_movements
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER created_by_user_id,
  ADD UNIQUE KEY uq_stock_movements_operation_key (operation_key);

INSERT INTO permissions (code, description) VALUES
  ('stock.read', 'Consultar saldos, alertas e histórico de estoque.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'stock.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'CAIXA', 'ESTOQUE');

INSERT INTO stock_movement_types (code, name, direction, is_active) VALUES
  ('INITIAL_BALANCE', 'Saldo inicial', 'IN', 1),
  ('MANUAL_ENTRY', 'Entrada manual', 'IN', 1),
  ('MANUAL_EXIT', 'Saída manual', 'OUT', 1),
  ('INVENTORY_GAIN', 'Ajuste positivo de inventário', 'IN', 1),
  ('INVENTORY_LOSS', 'Ajuste negativo de inventário', 'OUT', 1),
  ('LOSS', 'Perda ou avaria', 'OUT', 1),
  ('PURCHASE_RECEIPT', 'Recebimento de compra', 'IN', 1),
  ('SUPPLIER_RETURN', 'Devolução ao fornecedor', 'OUT', 1),
  ('SALE', 'Venda', 'OUT', 1),
  ('SALE_CANCEL', 'Estorno de venda', 'IN', 1),
  ('CUSTOMER_RETURN', 'Devolução de cliente', 'IN', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  direction = VALUES(direction),
  is_active = VALUES(is_active);

INSERT IGNORE INTO stock_balances (product_sku_id, quantity)
SELECT id, 0 FROM product_skus;

DROP TRIGGER IF EXISTS trg_stock_movements_no_update;
DROP TRIGGER IF EXISTS trg_stock_movements_no_delete;

CREATE TRIGGER trg_stock_movements_no_update
BEFORE UPDATE ON stock_movements
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movimentações de estoque são imutáveis; registre uma nova movimentação de correção.';

CREATE TRIGGER trg_stock_movements_no_delete
BEFORE DELETE ON stock_movements
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movimentações de estoque não podem ser excluídas; registre uma movimentação de correção.';
