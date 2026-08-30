ALTER TABLE catalog_orders
  MODIFY COLUMN status ENUM('NEW','WAITING_SERVICE','NEGOTIATING','CONFIRMED','CONVERTED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'NEW',
  ADD COLUMN contact_email VARCHAR(190) NULL AFTER contact_whatsapp,
  ADD COLUMN public_token_hash CHAR(64) NULL AFTER contact_email,
  ADD COLUMN public_operation_key VARCHAR(64) NULL AFTER public_token_hash,
  ADD COLUMN request_hash CHAR(64) NULL AFTER public_operation_key,
  ADD COLUMN internal_notes VARCHAR(500) NULL AFTER notes,
  ADD COLUMN confirmed_at DATETIME(3) NULL AFTER internal_notes,
  ADD COLUMN confirmed_by_user_id BIGINT UNSIGNED NULL AFTER confirmed_at,
  ADD COLUMN reservation_expires_at DATETIME(3) NULL AFTER confirmed_by_user_id,
  ADD COLUMN confirmation_operation_key VARCHAR(64) NULL AFTER reservation_expires_at,
  ADD COLUMN conversion_operation_key VARCHAR(64) NULL AFTER confirmation_operation_key,
  ADD COLUMN cancellation_operation_key VARCHAR(64) NULL AFTER conversion_operation_key,
  ADD COLUMN cancelled_at DATETIME(3) NULL AFTER cancellation_operation_key,
  ADD COLUMN cancelled_by_user_id BIGINT UNSIGNED NULL AFTER cancelled_at,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER cancelled_by_user_id,
  ADD UNIQUE KEY uq_catalog_orders_public_token_hash (public_token_hash),
  ADD UNIQUE KEY uq_catalog_orders_public_operation_key (public_operation_key),
  ADD UNIQUE KEY uq_catalog_orders_confirmation_key (confirmation_operation_key),
  ADD UNIQUE KEY uq_catalog_orders_conversion_key (conversion_operation_key),
  ADD UNIQUE KEY uq_catalog_orders_cancellation_key (cancellation_operation_key),
  ADD KEY idx_catalog_orders_status_updated (status, updated_at),
  ADD KEY idx_catalog_orders_confirmed_by (confirmed_by_user_id),
  ADD KEY idx_catalog_orders_cancelled_by (cancelled_by_user_id),
  ADD CONSTRAINT fk_catalog_orders_confirmed_by FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_catalog_orders_cancelled_by FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS stock_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  catalog_order_id BIGINT UNSIGNED NOT NULL,
  catalog_order_item_id BIGINT UNSIGNED NOT NULL,
  product_sku_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  status ENUM('ACTIVE','RELEASED','CONSUMED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  operation_key VARCHAR(64) NOT NULL,
  expires_at DATETIME(3) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  released_by_user_id BIGINT UNSIGNED NULL,
  consumed_by_user_id BIGINT UNSIGNED NULL,
  release_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  released_at DATETIME(3) NULL,
  consumed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_stock_reservations_operation_key (operation_key),
  KEY idx_stock_reservations_sku_active (product_sku_id, status, expires_at),
  KEY idx_stock_reservations_order_status (catalog_order_id, status),
  KEY idx_stock_reservations_order_item (catalog_order_item_id),
  CONSTRAINT chk_stock_reservations_quantity CHECK (quantity > 0),
  CONSTRAINT fk_stock_reservations_order FOREIGN KEY (catalog_order_id) REFERENCES catalog_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_reservations_order_item FOREIGN KEY (catalog_order_item_id) REFERENCES catalog_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_reservations_sku FOREIGN KEY (product_sku_id) REFERENCES product_skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_reservations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_reservations_released_by FOREIGN KEY (released_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_reservations_consumed_by FOREIGN KEY (consumed_by_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, description) VALUES
  ('catalog.orders.read', 'Consultar pedidos e reservas recebidos pelo catálogo.'),
  ('catalog.orders.manage', 'Atender, reservar, converter e cancelar pedidos do catálogo.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('catalog.orders.read','catalog.orders.manage')
WHERE r.code IN ('ADMINISTRADOR','GERENTE','VENDEDOR');
