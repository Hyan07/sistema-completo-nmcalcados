CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_sku_id BIGINT UNSIGNED NOT NULL,
  stock_movement_type_id BIGINT UNSIGNED NOT NULL,
  purchase_item_id BIGINT UNSIGNED NULL,
  sale_item_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  previous_quantity INT UNSIGNED NOT NULL,
  quantity_change INT NOT NULL,
  new_quantity INT UNSIGNED NOT NULL,
  reason VARCHAR(500) NULL,
  happened_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_stock_movements_sku_time (product_sku_id, happened_at),
  KEY idx_stock_movements_type_time (stock_movement_type_id, happened_at),
  KEY idx_stock_movements_purchase_item (purchase_item_id),
  KEY idx_stock_movements_sale_item (sale_item_id),
  CONSTRAINT chk_stock_movements_change CHECK (quantity_change <> 0),
  CONSTRAINT chk_stock_movements_consistency CHECK (new_quantity = previous_quantity + quantity_change),
  CONSTRAINT fk_stock_movements_sku
    FOREIGN KEY (product_sku_id) REFERENCES product_skus (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_type
    FOREIGN KEY (stock_movement_type_id) REFERENCES stock_movement_types (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_purchase_item
    FOREIGN KEY (purchase_item_id) REFERENCES purchase_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_sale_item
    FOREIGN KEY (sale_item_id) REFERENCES sale_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(50) NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  converted_sale_id BIGINT UNSIGNED NULL,
  status ENUM('NEW', 'WAITING_SERVICE', 'NEGOTIATING', 'CONFIRMED', 'CONVERTED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
  contact_name VARCHAR(180) NOT NULL,
  contact_phone VARCHAR(30) NULL,
  contact_whatsapp VARCHAR(30) NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_orders_order_number (order_number),
  UNIQUE KEY uq_catalog_orders_converted_sale (converted_sale_id),
  KEY idx_catalog_orders_status_created (status, created_at),
  KEY idx_catalog_orders_customer (customer_id, created_at),
  CONSTRAINT chk_catalog_orders_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_catalog_orders_total CHECK (total_amount >= 0),
  CONSTRAINT fk_catalog_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_orders_assigned_user
    FOREIGN KEY (assigned_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_orders_converted_sale
    FOREIGN KEY (converted_sale_id) REFERENCES sales (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  catalog_order_id BIGINT UNSIGNED NOT NULL,
  product_sku_id BIGINT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  variant_snapshot VARCHAR(180) NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_catalog_order_items_order (catalog_order_id),
  KEY idx_catalog_order_items_sku (product_sku_id),
  CONSTRAINT chk_catalog_order_items_quantity CHECK (quantity > 0),
  CONSTRAINT chk_catalog_order_items_unit_price CHECK (unit_price >= 0),
  CONSTRAINT chk_catalog_order_items_total CHECK (line_total >= 0),
  CONSTRAINT fk_catalog_order_items_order
    FOREIGN KEY (catalog_order_id) REFERENCES catalog_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_order_items_sku
    FOREIGN KEY (product_sku_id) REFERENCES product_skus (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action_code VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  previous_data JSON NULL,
  new_data JSON NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id, created_at),
  KEY idx_audit_logs_user_time (user_id, created_at),
  KEY idx_audit_logs_action_time (action_code, created_at),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
