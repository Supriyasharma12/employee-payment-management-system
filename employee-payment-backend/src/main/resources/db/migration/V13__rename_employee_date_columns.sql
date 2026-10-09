-- ============================================================
-- V13: Rename employee date columns
-- ============================================================

ALTER TABLE employees
    RENAME COLUMN dob TO date_of_birth;

ALTER TABLE employees
    RENAME COLUMN doj TO date_of_joining;