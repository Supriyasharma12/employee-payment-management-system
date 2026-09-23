-- ============================================================
-- Employee Payment Management System
-- V1 - Initial Database Schema
-- ============================================================


-- ============================================================
-- 1. ADMINS
-- ============================================================

CREATE TABLE admins (
                        id BIGSERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        username VARCHAR(100) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
                        active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        last_login_at TIMESTAMP
);


-- ============================================================
-- 2. EMPLOYEE CATEGORIES
-- ============================================================

CREATE TABLE employee_categories (
                                     id BIGSERIAL PRIMARY KEY,
                                     name VARCHAR(100) NOT NULL UNIQUE,
                                     active BOOLEAN NOT NULL DEFAULT TRUE,
                                     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. BANKS
-- ============================================================

CREATE TABLE banks (
                       id BIGSERIAL PRIMARY KEY,
                       bank_name VARCHAR(150) NOT NULL UNIQUE,
                       active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. EMPLOYEES
-- ============================================================

CREATE TABLE employees (
                           id BIGSERIAL PRIMARY KEY,

                           employee_code VARCHAR(30) NOT NULL UNIQUE,
                           name VARCHAR(150) NOT NULL,

                           account_number VARCHAR(50) NOT NULL,
                           ifsc_code VARCHAR(20) NOT NULL,

                           position VARCHAR(100),
                           phone_number VARCHAR(20),
                           email VARCHAR(150),

                           grade_pay NUMERIC(15, 2),
                           scale VARCHAR(100),
                           headquarters VARCHAR(150),
                           designation VARCHAR(150),

                           category_id BIGINT NOT NULL,
                           bank_id BIGINT,

                           active BOOLEAN NOT NULL DEFAULT TRUE,

                           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                           CONSTRAINT fk_employee_category
                               FOREIGN KEY (category_id)
                                   REFERENCES employee_categories(id),

                           CONSTRAINT fk_employee_bank
                               FOREIGN KEY (bank_id)
                                   REFERENCES banks(id)
);


-- ============================================================
-- 5. PAYMENT PERIODS
-- ============================================================

CREATE TABLE payment_periods (
                                 id BIGSERIAL PRIMARY KEY,

                                 month INTEGER NOT NULL,
                                 year INTEGER NOT NULL,

                                 start_date DATE,
                                 end_date DATE,

                                 status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT chk_payment_month
                                     CHECK (month BETWEEN 1 AND 12),

    CONSTRAINT chk_payment_year
        CHECK (year >= 2000),

    CONSTRAINT uq_payment_period
        UNIQUE (month, year)
);


-- ============================================================
-- 6. PAYMENTS
-- ============================================================

CREATE TABLE payments (
                          id BIGSERIAL PRIMARY KEY,

                          employee_id BIGINT NOT NULL,
                          payment_period_id BIGINT NOT NULL,

                          payment_date DATE NOT NULL,

    -- ------------------------
    -- GROSS
    -- ------------------------

                          running_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                          fixed_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                          other NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                          gross_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

    -- ------------------------
    -- DEDUCTIONS
    -- ------------------------

                          miscellaneous NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                          advance_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                          advance_other NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                          deduction_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

    -- ------------------------
    -- FINAL
    -- ------------------------

                          net_payment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                          status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

                          created_by BIGINT NOT NULL,
                          updated_by BIGINT,

                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_payment_employee
                              FOREIGN KEY (employee_id)
                                  REFERENCES employees(id),

                          CONSTRAINT fk_payment_period
                              FOREIGN KEY (payment_period_id)
                                  REFERENCES payment_periods(id),

                          CONSTRAINT fk_payment_created_by
                              FOREIGN KEY (created_by)
                                  REFERENCES admins(id),

                          CONSTRAINT fk_payment_updated_by
                              FOREIGN KEY (updated_by)
                                  REFERENCES admins(id),

                          CONSTRAINT uq_employee_payment_period
                              UNIQUE (employee_id, payment_period_id),

                          CONSTRAINT chk_running_ta
                              CHECK (running_ta >= 0),

                          CONSTRAINT chk_fixed_ta
                              CHECK (fixed_ta >= 0),

                          CONSTRAINT chk_other
                              CHECK (other >= 0),

                          CONSTRAINT chk_miscellaneous
                              CHECK (miscellaneous >= 0),

                          CONSTRAINT chk_advance_ta
                              CHECK (advance_ta >= 0),

                          CONSTRAINT chk_advance_other
                              CHECK (advance_other >= 0),

                          CONSTRAINT chk_gross_total
                              CHECK (gross_total >= 0),

                          CONSTRAINT chk_deduction_total
                              CHECK (deduction_total >= 0),

                          CONSTRAINT chk_net_payment
                              CHECK (net_payment >= 0)
);


-- ============================================================
-- 7. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
                            id BIGSERIAL PRIMARY KEY,

                            admin_id BIGINT NOT NULL,

                            action VARCHAR(50) NOT NULL,
                            entity_type VARCHAR(50),
                            entity_id BIGINT,

                            description TEXT,

                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_audit_admin
                                FOREIGN KEY (admin_id)
                                    REFERENCES admins(id)
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employee_name
    ON employees(name);

CREATE INDEX idx_employee_category
    ON employees(category_id);

CREATE INDEX idx_employee_bank
    ON employees(bank_id);

CREATE INDEX idx_payment_employee
    ON payments(employee_id);

CREATE INDEX idx_payment_period
    ON payments(payment_period_id);

CREATE INDEX idx_payment_date
    ON payments(payment_date);

CREATE INDEX idx_audit_admin
    ON audit_logs(admin_id);

CREATE INDEX idx_audit_created_at
    ON audit_logs(created_at);