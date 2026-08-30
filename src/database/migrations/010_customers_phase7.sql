ALTER TABLE customers
  ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER is_active,
  ADD COLUMN updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id,
  ADD KEY idx_customers_active_name (is_active, name),
  ADD KEY idx_customers_email (email),
  ADD KEY idx_customers_whatsapp (whatsapp),
  ADD KEY idx_customers_created_by (created_by_user_id),
  ADD KEY idx_customers_updated_by (updated_by_user_id),
  ADD CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_customers_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT INTO permissions (code, description) VALUES
  ('customers.read', 'Consultar clientes e seu histórico comercial.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'customers.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'CAIXA');
