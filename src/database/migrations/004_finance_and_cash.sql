CREATE TABLE IF NOT EXISTS cash_registers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cash_registers_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cash_register_id BIGINT UNSIGNED NOT NULL,
  operator_user_id BIGINT UNSIGNED NOT NULL,
  closed_by_user_id BIGINT UNSIGNED NULL,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  expected_closing_balance DECIMAL(15,2) NULL,
  declared_closing_balance DECIMAL(15,2) NULL,
  closing_difference DECIMAL(15,2) NULL,
  opened_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  closed_at DATETIME(3) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cash_sessions_register_status (cash_register_id, status),
  KEY idx_cash_sessions_operator_opened (operator_user_id, opened_at),
  CONSTRAINT chk_cash_sessions_opening_balance CHECK (opening_balance >= 0),
  CONSTRAINT fk_cash_sessions_register
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_sessions_operator
    FOREIGN KEY (operator_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_sessions_closed_by
    FOREIGN KEY (closed_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_payment_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  installments SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sale_payment_allocations_sale (sale_id),
  KEY idx_sale_payment_allocations_method (payment_method_id),
  CONSTRAINT chk_sale_payment_allocations_amount CHECK (amount > 0),
  CONSTRAINT chk_sale_payment_allocations_installments CHECK (installments > 0),
  CONSTRAINT fk_sale_payment_allocations_sale
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_sale_payment_allocations_method
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receivables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NULL,
  sale_payment_allocation_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  financial_category_id BIGINT UNSIGNED NULL,
  source_type ENUM('SALE', 'MANUAL') NOT NULL,
  installment_number SMALLINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  outstanding_amount DECIMAL(15,2) NOT NULL,
  status ENUM('OPEN', 'PARTIAL', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  cancelled_by_user_id BIGINT UNSIGNED NULL,
  cancelled_at DATETIME(3) NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_receivables_status_due (status, due_date),
  KEY idx_receivables_customer (customer_id, due_date),
  KEY idx_receivables_sale (sale_id),
  CONSTRAINT chk_receivables_original CHECK (original_amount > 0),
  CONSTRAINT chk_receivables_outstanding CHECK (outstanding_amount >= 0 AND outstanding_amount <= original_amount),
  CONSTRAINT fk_receivables_sale
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receivables_sale_payment
    FOREIGN KEY (sale_payment_allocation_id) REFERENCES sale_payment_allocations (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receivables_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receivables_category
    FOREIGN KEY (financial_category_id) REFERENCES financial_categories (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receivables_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receivables_cancelled_by
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NULL,
  payment_method_id BIGINT UNSIGNED NOT NULL,
  cash_session_id BIGINT UNSIGNED NULL,
  received_by_user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('CONFIRMED', 'REVERSED') NOT NULL DEFAULT 'CONFIRMED',
  received_at DATETIME(3) NOT NULL,
  reversed_at DATETIME(3) NULL,
  reversed_by_user_id BIGINT UNSIGNED NULL,
  reversal_reason VARCHAR(500) NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_receipts_received_at (received_at),
  KEY idx_receipts_customer (customer_id, received_at),
  KEY idx_receipts_cash_session (cash_session_id),
  CONSTRAINT chk_receipts_amount CHECK (amount > 0),
  CONSTRAINT fk_receipts_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receipts_payment_method
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receipts_cash_session
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receipts_received_by
    FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receipts_reversed_by
    FOREIGN KEY (reversed_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipt_allocations (
  receipt_id BIGINT UNSIGNED NOT NULL,
  receivable_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (receipt_id, receivable_id),
  KEY idx_receipt_allocations_receivable (receivable_id),
  CONSTRAINT chk_receipt_allocations_amount CHECK (amount > 0),
  CONSTRAINT fk_receipt_allocations_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipts (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_receipt_allocations_receivable
    FOREIGN KEY (receivable_id) REFERENCES receivables (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NULL,
  supplier_id BIGINT UNSIGNED NULL,
  financial_category_id BIGINT UNSIGNED NULL,
  source_type ENUM('PURCHASE', 'MANUAL') NOT NULL,
  installment_number SMALLINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  outstanding_amount DECIMAL(15,2) NOT NULL,
  status ENUM('OPEN', 'PARTIAL', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  cancelled_by_user_id BIGINT UNSIGNED NULL,
  cancelled_at DATETIME(3) NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_payables_status_due (status, due_date),
  KEY idx_payables_supplier (supplier_id, due_date),
  KEY idx_payables_purchase (purchase_id),
  CONSTRAINT chk_payables_original CHECK (original_amount > 0),
  CONSTRAINT chk_payables_outstanding CHECK (outstanding_amount >= 0 AND outstanding_amount <= original_amount),
  CONSTRAINT fk_payables_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_payables_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_payables_category
    FOREIGN KEY (financial_category_id) REFERENCES financial_categories (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_payables_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_payables_cancelled_by
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disbursements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NULL,
  financial_category_id BIGINT UNSIGNED NULL,
  payment_method_id BIGINT UNSIGNED NOT NULL,
  cash_session_id BIGINT UNSIGNED NULL,
  paid_by_user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('CONFIRMED', 'REVERSED') NOT NULL DEFAULT 'CONFIRMED',
  paid_at DATETIME(3) NOT NULL,
  reversed_at DATETIME(3) NULL,
  reversed_by_user_id BIGINT UNSIGNED NULL,
  reversal_reason VARCHAR(500) NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_disbursements_paid_at (paid_at),
  KEY idx_disbursements_supplier (supplier_id, paid_at),
  KEY idx_disbursements_cash_session (cash_session_id),
  CONSTRAINT chk_disbursements_amount CHECK (amount > 0),
  CONSTRAINT fk_disbursements_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursements_category
    FOREIGN KEY (financial_category_id) REFERENCES financial_categories (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursements_payment_method
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursements_cash_session
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursements_paid_by
    FOREIGN KEY (paid_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursements_reversed_by
    FOREIGN KEY (reversed_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disbursement_allocations (
  disbursement_id BIGINT UNSIGNED NOT NULL,
  payable_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (disbursement_id, payable_id),
  KEY idx_disbursement_allocations_payable (payable_id),
  CONSTRAINT chk_disbursement_allocations_amount CHECK (amount > 0),
  CONSTRAINT fk_disbursement_allocations_disbursement
    FOREIGN KEY (disbursement_id) REFERENCES disbursements (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_disbursement_allocations_payable
    FOREIGN KEY (payable_id) REFERENCES payables (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cash_session_id BIGINT UNSIGNED NOT NULL,
  cash_movement_type_id BIGINT UNSIGNED NOT NULL,
  receipt_id BIGINT UNSIGNED NULL,
  disbursement_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  happened_at DATETIME(3) NOT NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cash_movements_session_time (cash_session_id, happened_at),
  KEY idx_cash_movements_type (cash_movement_type_id),
  KEY idx_cash_movements_receipt (receipt_id),
  KEY idx_cash_movements_disbursement (disbursement_id),
  CONSTRAINT chk_cash_movements_amount CHECK (amount > 0),
  CONSTRAINT fk_cash_movements_session
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_movements_type
    FOREIGN KEY (cash_movement_type_id) REFERENCES cash_movement_types (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_movements_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipts (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_movements_disbursement
    FOREIGN KEY (disbursement_id) REFERENCES disbursements (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cash_movements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
