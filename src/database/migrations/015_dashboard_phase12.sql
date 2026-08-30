INSERT INTO permissions (code, description) VALUES
  ('dashboard.read', 'Consultar dashboard executivo com indicadores comerciais, estoque, caixa e financeiro.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'dashboard.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE');
