-- Esta migration precisa ser recuperavel porque ALTER TABLE faz commit implicito no MySQL.
-- Se uma etapa falhar, as etapas anteriores podem permanecer aplicadas mesmo sem o arquivo
-- ter sido registrado em schema_migrations. Por isso cada objeto novo e criado somente
-- quando ainda nao existe no schema atual.

SET @nm_schema = DATABASE();

-- cash_sessions: garante no maximo um caixa OPEN por registrador.
SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE cash_sessions ADD COLUMN open_register_guard BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = ''OPEN'' THEN cash_register_id ELSE NULL END) STORED',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'cash_sessions'
  AND COLUMN_NAME = 'open_register_guard';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE cash_sessions ADD UNIQUE KEY uq_cash_sessions_one_open_register (open_register_guard)',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'cash_sessions'
  AND INDEX_NAME = 'uq_cash_sessions_one_open_register';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

-- cash_sessions: garante no maximo um caixa OPEN por operador.
SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE cash_sessions ADD COLUMN open_operator_guard BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = ''OPEN'' THEN operator_user_id ELSE NULL END) STORED',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'cash_sessions'
  AND COLUMN_NAME = 'open_operator_guard';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE cash_sessions ADD UNIQUE KEY uq_cash_sessions_one_open_operator (open_operator_guard)',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'cash_sessions'
  AND INDEX_NAME = 'uq_cash_sessions_one_open_operator';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

-- uq_catalog_orders_converted_sale ja existe desde 005_stock_history_catalog_audit.sql.
-- Aqui adicionamos apenas a invariavel de status -> venda convertida.
SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE catalog_orders ADD CONSTRAINT chk_catalog_orders_converted_sale CHECK (status <> ''CONVERTED'' OR converted_sale_id IS NOT NULL)',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @nm_schema
  AND TABLE_NAME = 'catalog_orders'
  AND CONSTRAINT_NAME = 'chk_catalog_orders_converted_sale'
  AND CONSTRAINT_TYPE = 'CHECK';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

-- stock_reservations: no maximo uma reserva ACTIVE por item do pedido.
SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE stock_reservations ADD COLUMN active_order_item_guard BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = ''ACTIVE'' THEN catalog_order_item_id ELSE NULL END) STORED',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'stock_reservations'
  AND COLUMN_NAME = 'active_order_item_guard';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE stock_reservations ADD UNIQUE KEY uq_stock_reservations_one_active_item (active_order_item_guard)',
  'SELECT 1'
) INTO @nm_ddl
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @nm_schema
  AND TABLE_NAME = 'stock_reservations'
  AND INDEX_NAME = 'uq_stock_reservations_one_active_item';
PREPARE nm_stmt FROM @nm_ddl;
EXECUTE nm_stmt;
DEALLOCATE PREPARE nm_stmt;

SET @nm_ddl = NULL;
SET @nm_schema = NULL;
