ALTER TABLE employees
    ADD COLUMN employee_code_sort NUMERIC(30, 0)
        GENERATED ALWAYS AS (
    CASE
    WHEN employee_code ~ '^[0-9]+$'
    THEN employee_code::NUMERIC
        ELSE NULL
END
) STORED;

CREATE INDEX idx_employees_employee_code_sort
    ON employees (employee_code_sort);