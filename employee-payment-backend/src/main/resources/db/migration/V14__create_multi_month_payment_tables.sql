
-- ============================================================
-- V14: Multi-month payment support
-- Creates monthly details and employee-month reservations.
-- Existing payments table is not modified in this migration.
-- ============================================================

-- 1. Monthly calculation details
CREATE TABLE payment_monthly_details (
                                         id BIGSERIAL PRIMARY KEY,

                                         payment_id BIGINT NOT NULL,
                                         payment_period_id BIGINT NOT NULL,

                                         running_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                                         fixed_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                                         other NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                                         gross_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                                         miscellaneous NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                                         advance_ta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                                         advance_other NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                                         deduction_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                                         net_payment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

                                         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                         CONSTRAINT fk_monthly_detail_payment
                                             FOREIGN KEY (payment_id)
                                                 REFERENCES payments(id),

                                         CONSTRAINT fk_monthly_detail_period
                                             FOREIGN KEY (payment_period_id)
                                                 REFERENCES payment_periods(id),

                                         CONSTRAINT uq_payment_monthly_detail
                                             UNIQUE (payment_id, payment_period_id),

                                         CONSTRAINT chk_monthly_running_ta
                                             CHECK (running_ta >= 0),

                                         CONSTRAINT chk_monthly_fixed_ta
                                             CHECK (fixed_ta >= 0),

                                         CONSTRAINT chk_monthly_other
                                             CHECK (other >= 0),

                                         CONSTRAINT chk_monthly_gross_total
                                             CHECK (gross_total >= 0),

                                         CONSTRAINT chk_monthly_miscellaneous
                                             CHECK (miscellaneous >= 0),

                                         CONSTRAINT chk_monthly_advance_ta
                                             CHECK (advance_ta >= 0),

                                         CONSTRAINT chk_monthly_advance_other
                                             CHECK (advance_other >= 0),

                                         CONSTRAINT chk_monthly_deduction_total
                                             CHECK (deduction_total >= 0),

                                         CONSTRAINT chk_monthly_net_payment
                                             CHECK (net_payment >= 0)
);

CREATE INDEX idx_monthly_detail_period
    ON payment_monthly_details(payment_period_id);

CREATE INDEX idx_monthly_detail_payment
    ON payment_monthly_details(payment_id);


-- 2. Employee-month reservation records
CREATE TABLE payment_month_reservations (
                                            id BIGSERIAL PRIMARY KEY,

                                            employee_id BIGINT NOT NULL,
                                            payment_period_id BIGINT NOT NULL,
                                            payment_id BIGINT NOT NULL,

                                            status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',

                                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                            released_at TIMESTAMP,

                                            CONSTRAINT fk_month_reservation_employee
                                                FOREIGN KEY (employee_id)
                                                    REFERENCES employees(id),

                                            CONSTRAINT fk_month_reservation_period
                                                FOREIGN KEY (payment_period_id)
                                                    REFERENCES payment_periods(id),

                                            CONSTRAINT fk_month_reservation_payment
                                                FOREIGN KEY (payment_id)
                                                    REFERENCES payments(id),

                                            CONSTRAINT chk_month_reservation_status
                                                CHECK (status IN ('RESERVED', 'PAID', 'RELEASED'))
);

-- Supports lookups by employee and month.
CREATE INDEX idx_month_reservation_employee_period
    ON payment_month_reservations(employee_id, payment_period_id);

CREATE INDEX idx_month_reservation_payment
    ON payment_month_reservations(payment_id);

-- Only one active reservation or paid record may exist
-- for the same employee and month.
CREATE UNIQUE INDEX uq_active_employee_month_reservation
    ON payment_month_reservations(employee_id, payment_period_id)
    WHERE status IN ('RESERVED', 'PAID');
