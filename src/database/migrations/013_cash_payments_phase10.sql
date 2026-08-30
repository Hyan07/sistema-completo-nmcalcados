ALTER TABLE cash_sessions
  ADD COLUMN opening_operation_key VARCHAR(64) NULL AFTER operator_user_id,
  ADD COLUMN closing_operation_key VARCHAR(64) NULL AFTER closed_by_user_id,
  ADD UNIQUE KEY uq_cash_sessions_opening_operation_key (opening_operation_key),
  ADD UNIQUE KEY uq_cash_sessions_closing_operation_key (closing_operation_key);

CREATE TABLE IF NOT EXISTS sale_payment_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  cash_session_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  reversed_by_user_id BIGINT UNSIGNED NULL,
  operation_key VARCHAR(64) NOT NULL,
  status ENUM('CONFIRMED', 'REVERSED') NOT NULL DEFAULT 'CONFIRMED',
  reversed_at DATETIME(3) NULL,
  reversal_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sale_payment_batches_operation_key (operation_key),
  KEY idx_sale_payment_batches_sale_status (sale_id, status, created_at),
  KEY idx_sale_payment_batches_session (cash_session_id, created_at),
  CONSTRAINT fk_sale_payment_batches_sale
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sale_payment_batches_session
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sale_payment_batches_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sale_payment_batches_reversed_by
    FOREIGN KEY (reversed_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sale_payment_allocations
  ADD COLUMN payment_batch_id BIGINT UNSIGNED NULL AFTER sale_id,
  ADD KEY idx_sale_payment_allocations_batch (payment_batch_id),
  ADD CONSTRAINT fk_sale_payment_allocations_batch
    FOREIGN KEY (payment_batch_id) REFERENCES sale_payment_batches (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE receipts
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER received_by_user_id,
  ADD UNIQUE KEY uq_receipts_operation_key (operation_key);

ALTER TABLE cash_movements
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER created_by_user_id,
  ADD UNIQUE KEY uq_cash_movements_operation_key (operation_key);

INSERT INTO payment_methods (code, name, requires_cash_session, creates_receivable, is_active, sort_order) VALUES
  ('CASH', 'Dinheiro', 1, 0, 1, 10),
  ('PIX', 'PIX', 0, 0, 1, 20),
  ('DEBIT_CARD', 'Cartão de débito', 0, 1, 1, 30),
  ('CREDIT_CARD', 'Cartão de crédito', 0, 1, 1, 40)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  requires_cash_session = VALUES(requires_cash_session),
  creates_receivable = VALUES(creates_receivable),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

INSERT INTO cash_movement_types (code, name, direction, is_active) VALUES
  ('SALE_RECEIPT', 'Recebimento de venda em dinheiro', 'IN', 1),
  ('CASH_SUPPLY', 'Suprimento de caixa', 'IN', 1),
  ('CASH_WITHDRAWAL', 'Sangria de caixa', 'OUT', 1),
  ('RECEIPT_REVERSAL', 'Estorno de recebimento em dinheiro', 'OUT', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  direction = VALUES(direction),
  is_active = VALUES(is_active);

INSERT INTO permissions (code, description) VALUES
  ('cash.read', 'Consultar caixas, sessões e movimentos de caixa.'),
  ('payments.read', 'Consultar formas de pagamento, alocações e recebimentos de vendas.'),
  ('payments.manage', 'Registrar pagamentos e recebimentos de vendas.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code IN ('cash.read', 'payments.read')
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'CAIXA');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'payments.read'
 WHERE r.code = 'VENDEDOR';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'payments.manage'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'CAIXA');

DROP TRIGGER IF EXISTS trg_cash_movements_no_update;
DROP TRIGGER IF EXISTS trg_cash_movements_no_delete;
DROP TRIGGER IF EXISTS trg_sale_payment_allocations_no_update;
DROP TRIGGER IF EXISTS trg_sale_payment_allocations_no_delete;
DROP TRIGGER IF EXISTS trg_receipt_allocations_no_update;
DROP TRIGGER IF EXISTS trg_receipt_allocations_no_delete;

CREATE TRIGGER trg_cash_movements_no_update
BEFORE UPDATE ON cash_movements
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movimentos de caixa são imutáveis; registre um movimento de correção.';

CREATE TRIGGER trg_cash_movements_no_delete
BEFORE DELETE ON cash_movements
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movimentos de caixa não podem ser excluídos.';

CREATE TRIGGER trg_sale_payment_allocations_no_update
BEFORE UPDATE ON sale_payment_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de pagamento são imutáveis.';

CREATE TRIGGER trg_sale_payment_allocations_no_delete
BEFORE DELETE ON sale_payment_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de pagamento não podem ser excluídas.';

CREATE TRIGGER trg_receipt_allocations_no_update
BEFORE UPDATE ON receipt_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de recebimento são imutáveis.';

CREATE TRIGGER trg_receipt_allocations_no_delete
BEFORE DELETE ON receipt_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de recebimento não podem ser excluídas.';
