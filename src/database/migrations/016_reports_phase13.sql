INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'reports.read'
 WHERE r.code IN ('CAIXA', 'ESTOQUE');
