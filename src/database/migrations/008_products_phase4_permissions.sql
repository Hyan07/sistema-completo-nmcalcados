INSERT INTO permissions (code, description) VALUES
  ('products.read', 'Consultar categorias, marcas, produtos e imagens.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'products.read'
 WHERE r.code IN ('ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'CAIXA', 'ESTOQUE');
