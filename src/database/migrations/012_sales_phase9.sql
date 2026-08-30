ALTER TABLE sales
  ADD COLUMN updated_by_user_id BIGINT UNSIGNED NULL AFTER seller_user_id,
  ADD COLUMN completed_by_user_id BIGINT UNSIGNED NULL AFTER updated_by_user_id,
  ADD COLUMN completion_operation_key VARCHAR(64) NULL AFTER completed_by_user_id,
  ADD COLUMN cancellation_operation_key VARCHAR(64) NULL AFTER cancellation_reason,
  ADD UNIQUE KEY uq_sales_completion_operation_key (completion_operation_key),
  ADD UNIQUE KEY uq_sales_cancellation_operation_key (cancellation_operation_key),
  ADD KEY idx_sales_updated_by (updated_by_user_id),
  ADD KEY idx_sales_completed_by (completed_by_user_id),
  ADD CONSTRAINT fk_sales_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_sales_completed_by
    FOREIGN KEY (completed_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE sale_items
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER line_total,
  ADD COLUMN cancelled_at DATETIME(3) NULL AFTER is_active,
  ADD COLUMN cancelled_by_user_id BIGINT UNSIGNED NULL AFTER cancelled_at,
  ADD KEY idx_sale_items_sale_active (sale_id, is_active),
  ADD KEY idx_sale_items_cancelled_by (cancelled_by_user_id),
  ADD CONSTRAINT fk_sale_items_cancelled_by
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT INTO permissions (code, description) VALUES
  ('sales.read', 'Consultar vendas, itens e histórico do PDV.'),
  ('sales.discount', 'Aplicar descontos e acréscimos manuais em vendas.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'sales.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'CAIXA');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'sales.discount'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE');
