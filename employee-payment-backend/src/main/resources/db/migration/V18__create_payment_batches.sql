-- V18: Introduce payment batches.
-- Existing payments remain valid and are not assigned to a batch.

-- 1. Create payment batches.
CREATE TABLE payment_batches (
                                 id BIGSERIAL PRIMARY KEY,

                                 batch_name VARCHAR(100) NOT NULL,

                                 status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

                                 approved_at TIMESTAMP,

                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT chk_payment_batch_status
                                     CHECK (status IN ('DRAFT', 'APPROVED', 'CANCELLED'))
);

-- 2. Associate payments with batches.
-- Nullable to preserve existing payment records.
ALTER TABLE payments
    ADD COLUMN payment_batch_id BIGINT;

ALTER TABLE payments
    ADD CONSTRAINT fk_payment_batch
        FOREIGN KEY (payment_batch_id)
            REFERENCES payment_batches(id);

-- 3. Support efficient batch payment lookups.
CREATE INDEX idx_payment_batch
    ON payments(payment_batch_id);