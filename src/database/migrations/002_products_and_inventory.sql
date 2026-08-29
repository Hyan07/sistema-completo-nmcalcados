CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NULL,
  brand_id BIGINT UNSIGNED NULL,
  internal_code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  model VARCHAR(120) NULL,
  audience VARCHAR(80) NULL,
  collection_name VARCHAR(120) NULL,
  material VARCHAR(120) NULL,
  base_cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  base_sale_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  promotional_price DECIMAL(15,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_catalog_visible TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_internal_code (internal_code),
  KEY idx_products_catalog (is_active, is_catalog_visible, is_featured),
  KEY idx_products_category (category_id),
  KEY idx_products_brand (brand_id),
  CONSTRAINT chk_products_base_cost CHECK (base_cost_price >= 0),
  CONSTRAINT chk_products_base_sale CHECK (base_sale_price >= 0),
  CONSTRAINT chk_products_promo CHECK (promotional_price IS NULL OR promotional_price >= 0),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_products_brand
    FOREIGN KEY (brand_id) REFERENCES brands (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  color_id BIGINT UNSIGNED NOT NULL,
  variant_name VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_variants_product_color (product_id, color_id),
  KEY idx_product_variants_color (color_id),
  CONSTRAINT fk_product_variants_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_product_variants_color
    FOREIGN KEY (color_id) REFERENCES colors (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_skus (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  size_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100) NULL,
  cost_price DECIMAL(15,2) NULL,
  sale_price DECIMAL(15,2) NULL,
  promotional_price DECIMAL(15,2) NULL,
  minimum_stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_skus_sku (sku),
  UNIQUE KEY uq_product_skus_barcode (barcode),
  UNIQUE KEY uq_product_skus_variant_size (product_variant_id, size_id),
  KEY idx_product_skus_size (size_id),
  CONSTRAINT chk_product_skus_cost CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT chk_product_skus_sale CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT chk_product_skus_promo CHECK (promotional_price IS NULL OR promotional_price >= 0),
  CONSTRAINT fk_product_skus_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_product_skus_size
    FOREIGN KEY (size_id) REFERENCES sizes (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  product_variant_id BIGINT UNSIGNED NULL,
  file_path VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_product_images_product_order (product_id, sort_order),
  KEY idx_product_images_variant (product_variant_id),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_product_images_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_balances (
  product_sku_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (product_sku_id),
  KEY idx_stock_balances_quantity (quantity),
  CONSTRAINT fk_stock_balances_sku
    FOREIGN KEY (product_sku_id) REFERENCES product_skus (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
