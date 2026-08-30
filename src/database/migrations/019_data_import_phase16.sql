CREATE TABLE IF NOT EXISTS data_import_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  import_type ENUM('CATALOG','CUSTOMERS','SUPPLIERS','OPENING_STOCK') NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  schema_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('VALIDATED','INVALID','APPLIED','FAILED') NOT NULL,
  validation_operation_key VARCHAR(64) NOT NULL,
  apply_operation_key VARCHAR(64) NULL,
  row_count INT UNSIGNED NOT NULL DEFAULT 0,
  valid_rows INT UNSIGNED NOT NULL DEFAULT 0,
  invalid_rows INT UNSIGNED NOT NULL DEFAULT 0,
  validation_errors JSON NULL,
  result_summary JSON NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  applied_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  validated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_data_import_validation_key (validation_operation_key),
  UNIQUE KEY uq_data_import_apply_key (apply_operation_key),
  KEY idx_data_import_type_created (import_type, created_at),
  KEY idx_data_import_status_created (status, created_at),
  KEY idx_data_import_created_by (created_by_user_id, created_at),
  CONSTRAINT fk_data_import_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_data_import_applied_by FOREIGN KEY (applied_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_data_import_counts CHECK (valid_rows + invalid_rows = row_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, description) VALUES
  ('imports.read', 'Consultar lotes e resultados de importação de dados.'),
  ('imports.manage', 'Validar e aplicar importações de dados reais.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code IN ('imports.read','imports.manage')
 WHERE r.code = 'ADMINISTRADOR';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.code = 'imports.read'
 WHERE r.code = 'GERENTE';
