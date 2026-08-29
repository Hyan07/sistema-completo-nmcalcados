ALTER TABLE users
  ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER password_changed_at,
  ADD COLUMN locked_until DATETIME(3) NULL AFTER failed_login_attempts,
  ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER locked_until;

CREATE TABLE IF NOT EXISTS app_sessions (
  sid VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  sess JSON NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sid),
  KEY idx_app_sessions_expires (expires_at),
  KEY idx_app_sessions_user (user_id, expires_at),
  CONSTRAINT fk_app_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (code, name, description, is_active) VALUES
  ('ADMINISTRADOR', 'Administrador', 'Acesso administrativo completo ao sistema.', 1),
  ('GERENTE', 'Gerente', 'Gestão operacional, consultas e relatórios.', 1),
  ('VENDEDOR', 'Vendedor', 'Vendas, clientes e consultas operacionais.', 1),
  ('CAIXA', 'Caixa', 'Operações de caixa e recebimentos.', 1),
  ('ESTOQUE', 'Estoque', 'Produtos, compras e movimentações de estoque.', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT INTO permissions (code, description) VALUES
  ('users.read', 'Consultar usuários.'),
  ('users.create', 'Criar usuários.'),
  ('users.update', 'Alterar dados, perfil e status de usuários.'),
  ('roles.read', 'Consultar perfis e suas permissões.'),
  ('permissions.read', 'Consultar permissões cadastradas.'),
  ('audit.read', 'Consultar auditoria.'),
  ('products.manage', 'Gerenciar produtos e cadastros relacionados.'),
  ('stock.manage', 'Gerenciar estoque e suas movimentações.'),
  ('customers.manage', 'Gerenciar clientes.'),
  ('suppliers.manage', 'Gerenciar fornecedores.'),
  ('purchases.manage', 'Gerenciar compras e entradas.'),
  ('sales.create', 'Realizar vendas.'),
  ('sales.cancel', 'Cancelar vendas conforme regras de negócio.'),
  ('cash.manage', 'Abrir, movimentar e fechar caixa.'),
  ('finance.manage', 'Gerenciar contas a pagar, receber e fluxo financeiro.'),
  ('reports.read', 'Consultar relatórios.'),
  ('catalog.manage', 'Gerenciar publicação no catálogo.')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMINISTRADOR';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'users.read', 'roles.read', 'audit.read', 'products.manage', 'stock.manage',
  'customers.manage', 'suppliers.manage', 'purchases.manage', 'sales.create',
  'sales.cancel', 'cash.manage', 'finance.manage', 'reports.read', 'catalog.manage'
) WHERE r.code = 'GERENTE';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('sales.create', 'customers.manage', 'reports.read') WHERE r.code = 'VENDEDOR';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('sales.create', 'customers.manage', 'cash.manage') WHERE r.code = 'CAIXA';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('products.manage', 'stock.manage', 'suppliers.manage', 'purchases.manage') WHERE r.code = 'ESTOQUE';
