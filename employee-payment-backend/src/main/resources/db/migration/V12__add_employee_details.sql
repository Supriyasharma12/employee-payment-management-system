-- ============================================================
-- V12: Add additional employee details
-- ============================================================

ALTER TABLE employees
    ADD COLUMN department VARCHAR(50),
    ADD COLUMN medical_card_id VARCHAR(50),
    ADD COLUMN uan VARCHAR(12),
    ADD COLUMN aadhaar VARCHAR(12),
    ADD COLUMN dob DATE,
    ADD COLUMN doj DATE;