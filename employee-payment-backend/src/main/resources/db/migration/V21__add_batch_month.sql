
-- Add the calendar month represented by each payment batch.
ALTER TABLE payment_batches
    ADD COLUMN batch_month DATE;

-- Backfill existing batches using the confirmed month mapping.
UPDATE payment_batches
SET batch_month = CASE id
                      WHEN 1 THEN DATE '2026-10-01'
                      WHEN 2 THEN DATE '2026-09-01'
                      WHEN 3 THEN DATE '2026-08-01'
                      ELSE NULL
    END;

-- Stop migration if any existing batch was not mapped.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payment_batches
        WHERE batch_month IS NULL
    ) THEN
        RAISE EXCEPTION
            'Some payment batches have no assigned batch_month. Migration stopped.';
END IF;
END $$;

-- Every batch must represent a month.
ALTER TABLE payment_batches
    ALTER COLUMN batch_month SET NOT NULL;

-- One batch per calendar month, whether OPEN or CLOSED.
ALTER TABLE payment_batches
    ADD CONSTRAINT uq_payment_batches_batch_month
        UNIQUE (batch_month);
