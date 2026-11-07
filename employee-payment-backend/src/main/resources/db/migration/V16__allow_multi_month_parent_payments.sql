
-- V16: Allow one parent payment to cover multiple months.
-- Monthly periods are stored in payment_monthly_details.
-- Existing payment_period_id values are preserved for legacy records.

-- A parent payment may now have no single representative period.
ALTER TABLE payments
    ALTER COLUMN payment_period_id DROP NOT NULL;

-- The employee-month uniqueness rule now belongs to the
-- monthly reservation/detail design, not the parent payment.
ALTER TABLE payments
DROP CONSTRAINT uq_employee_payment_period;
