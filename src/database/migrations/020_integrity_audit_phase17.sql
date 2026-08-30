ALTER TABLE cash_sessions
  ADD COLUMN open_register_guard BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN status = 'OPEN' THEN cash_register_id ELSE NULL END) STORED,
  ADD COLUMN open_operator_guard BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN status = 'OPEN' THEN operator_user_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_cash_sessions_one_open_register (open_register_guard),
  ADD UNIQUE KEY uq_cash_sessions_one_open_operator (open_operator_guard);

ALTER TABLE catalog_orders
  ADD UNIQUE KEY uq_catalog_orders_converted_sale (converted_sale_id),
  ADD CONSTRAINT chk_catalog_orders_converted_sale
    CHECK (status <> 'CONVERTED' OR converted_sale_id IS NOT NULL);

ALTER TABLE stock_reservations
  ADD COLUMN active_order_item_guard BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN catalog_order_item_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_stock_reservations_one_active_item (active_order_item_guard);
