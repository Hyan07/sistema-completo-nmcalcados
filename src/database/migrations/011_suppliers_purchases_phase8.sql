ALTER TABLE suppliers
  ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER is_active,
  ADD COLUMN updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id,
  ADD KEY idx_suppliers_active_legal_name (is_active, legal_name),
  ADD KEY idx_suppliers_email (email),
  ADD KEY idx_suppliers_whatsapp (whatsapp),
  ADD KEY idx_suppliers_created_by (created_by_user_id),
  ADD KEY idx_suppliers_updated_by (updated_by_user_id),
  ADD CONSTRAINT fk_suppliers_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_suppliers_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE purchases
  ADD COLUMN updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id,
  ADD KEY idx_purchases_updated_by (updated_by_user_id),
  ADD CONSTRAINT fk_purchases_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE purchase_items
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER line_total,
  ADD COLUMN cancelled_at DATETIME(3) NULL AFTER is_active,
  ADD COLUMN cancelled_by_user_id BIGINT UNSIGNED NULL AFTER cancelled_at,
  ADD KEY idx_purchase_items_purchase_active (purchase_id, is_active),
  ADD KEY idx_purchase_items_cancelled_by (cancelled_by_user_id),
  ADD CONSTRAINT fk_purchase_items_cancelled_by
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NOT NULL,
  received_by_user_id BIGINT UNSIGNED NOT NULL,
  operation_key VARCHAR(64) NOT NULL,
  notes VARCHAR(500) NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_receipts_operation_key (operation_key),
  KEY idx_purchase_receipts_purchase_time (purchase_id, received_at),
  KEY idx_purchase_receipts_user_time (received_by_user_id, received_at),
  CONSTRAINT fk_purchase_receipts_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_receipts_user
    FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  purchase_receipt_id BIGINT UNSIGNED NOT NULL,
  purchase_item_id BIGINT UNSIGNED NOT NULL,
  quantity_received INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (purchase_receipt_id, purchase_item_id),
  KEY idx_purchase_receipt_items_purchase_item (purchase_item_id),
  CONSTRAINT chk_purchase_receipt_items_quantity CHECK (quantity_received > 0),
  CONSTRAINT fk_purchase_receipt_items_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_receipt_items_purchase_item
    FOREIGN KEY (purchase_item_id) REFERENCES purchase_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, description) VALUES
  ('suppliers.read', 'Consultar fornecedores.'),
  ('purchases.read', 'Consultar compras e recebimentos.'),
  ('purchases.receive', 'Confirmar recebimento físico de mercadorias compradas.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code IN ('suppliers.read', 'purchases.read', 'purchases.receive')
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'ESTOQUE');

DROP TRIGGER IF EXISTS trg_purchase_receipts_no_update;
DROP TRIGGER IF EXISTS trg_purchase_receipts_no_delete;
DROP TRIGGER IF EXISTS trg_purchase_receipt_items_no_update;
DROP TRIGGER IF EXISTS trg_purchase_receipt_items_no_delete;

CREATE TRIGGER trg_purchase_receipts_no_update
BEFORE UPDATE ON purchase_receipts
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recebimentos de compra são imutáveis.';

CREATE TRIGGER trg_purchase_receipts_no_delete
BEFORE DELETE ON purchase_receipts
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recebimentos de compra não podem ser excluídos.';

CREATE TRIGGER trg_purchase_receipt_items_no_update
BEFORE UPDATE ON purchase_receipt_items
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Itens de recebimento são imutáveis.';

CREATE TRIGGER trg_purchase_receipt_items_no_delete
BEFORE DELETE ON purchase_receipt_items
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Itens de recebimento não podem ser excluídos.';
