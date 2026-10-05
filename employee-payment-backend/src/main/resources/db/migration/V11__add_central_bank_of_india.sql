INSERT INTO banks (bank_name, active)
VALUES ('Central Bank of India', TRUE)
    ON CONFLICT (bank_name) DO NOTHING;