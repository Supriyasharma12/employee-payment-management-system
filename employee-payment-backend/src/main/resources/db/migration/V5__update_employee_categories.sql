UPDATE employee_categories
SET name = 'Regular'
WHERE id = 1;

UPDATE employee_categories
SET name = 'Consolidated'
WHERE id = 2;

UPDATE employee_categories
SET name = 'Sudha Mitra'
WHERE id = 3;

UPDATE employee_categories
SET name = 'Project'
WHERE id = 4;

UPDATE employee_categories
SET name = 'Campus'
WHERE id = 5;

INSERT INTO employee_categories (name, active)
VALUES ('Outsourcing', TRUE)
    ON CONFLICT (name) DO NOTHING;