ALTER TABLE receivables
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER created_by_user_id,
  ADD UNIQUE KEY uq_receivables_operation_key (operation_key);

ALTER TABLE payables
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER created_by_user_id,
  ADD UNIQUE KEY uq_payables_operation_key (operation_key);

ALTER TABLE receipts
  ADD COLUMN reversal_operation_key VARCHAR(64) NULL AFTER operation_key,
  ADD UNIQUE KEY uq_receipts_reversal_operation_key (reversal_operation_key);

ALTER TABLE disbursements
  ADD COLUMN operation_key VARCHAR(64) NULL AFTER paid_by_user_id,
  ADD COLUMN reversal_operation_key VARCHAR(64) NULL AFTER operation_key,
  ADD UNIQUE KEY uq_disbursements_operation_key (operation_key),
  ADD UNIQUE KEY uq_disbursements_reversal_operation_key (reversal_operation_key);

ALTER TABLE purchases
  ADD COLUMN financialized_at DATETIME(3) NULL AFTER received_at,
  ADD COLUMN financialized_by_user_id BIGINT UNSIGNED NULL AFTER financialized_at,
  ADD COLUMN financialization_operation_key VARCHAR(64) NULL AFTER financialized_by_user_id,
  ADD UNIQUE KEY uq_purchases_financialization_operation_key (financialization_operation_key),
  ADD KEY idx_purchases_financialized_by (financialized_by_user_id),
  ADD CONSTRAINT fk_purchases_financialized_by
    FOREIGN KEY (financialized_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT INTO payment_methods (code, name, requires_cash_session, creates_receivable, is_active, sort_order) VALUES
  ('BANK_TRANSFER', 'Transferência bancária', 0, 0, 1, 25)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  requires_cash_session = VALUES(requires_cash_session),
  creates_receivable = VALUES(creates_receivable),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

INSERT INTO cash_movement_types (code, name, direction, is_active) VALUES
  ('RECEIVABLE_RECEIPT', 'Recebimento financeiro em dinheiro', 'IN', 1),
  ('PAYABLE_PAYMENT', 'Pagamento financeiro em dinheiro', 'OUT', 1),
  ('DISBURSEMENT_REVERSAL', 'Estorno de pagamento em dinheiro', 'IN', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  direction = VALUES(direction),
  is_active = VALUES(is_active);

INSERT INTO financial_categories (parent_id, type, code, name, is_active) VALUES
  (NULL, 'INCOME', 'OTHER_INCOME', 'Outras receitas', 1),
  (NULL, 'EXPENSE', 'PURCHASES', 'Compras de mercadorias', 1),
  (NULL, 'EXPENSE', 'OPERATING_EXPENSE', 'Despesas operacionais', 1)
ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  name = VALUES(name),
  is_active = VALUES(is_active);

INSERT INTO permissions (code, description) VALUES
  ('finance.read', 'Consultar contas a pagar, receber, liquidações e fluxo financeiro.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'finance.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'CAIXA');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'finance.manage'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE');

DROP TRIGGER IF EXISTS trg_disbursement_allocations_no_update;
DROP TRIGGER IF EXISTS trg_disbursement_allocations_no_delete;

CREATE TRIGGER trg_disbursement_allocations_no_update
BEFORE UPDATE ON disbursement_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de pagamento a fornecedor são imutáveis.';

CREATE TRIGGER trg_disbursement_allocations_no_delete
BEFORE DELETE ON disbursement_allocations
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alocações de pagamento a fornecedor não podem ser excluídas.';
