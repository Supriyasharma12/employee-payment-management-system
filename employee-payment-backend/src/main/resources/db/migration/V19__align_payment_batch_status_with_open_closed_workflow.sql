-- ============================================================
-- V19: Align payment batch statuses with the OPEN/CLOSED workflow
--
-- DRAFT batches created by V18 become OPEN.
-- Batch closure is now a manual operation.
-- ============================================================

-- 1. Remove the old status constraint.
ALTER TABLE payment_batches
DROP CONSTRAINT chk_payment_batch_status;


-- 2. Convert existing DRAFT batches to OPEN.
UPDATE payment_batches
SET status = 'OPEN',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'DRAFT';


-- 3. Set OPEN as the default status for new batches.
ALTER TABLE payment_batches
ALTER COLUMN status SET DEFAULT 'OPEN';


-- 4. Allow only OPEN and CLOSED statuses.
ALTER TABLE payment_batches
ADD CONSTRAINT chk_payment_batch_status
CHECK (status IN ('OPEN', 'CLOSED'));