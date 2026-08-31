INSERT INTO permissions (code, description) VALUES
  ('purchases.confirm', 'Confirmar uma compra e lançar todos os itens pendentes no estoque.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'purchases.confirm'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'ESTOQUE');
