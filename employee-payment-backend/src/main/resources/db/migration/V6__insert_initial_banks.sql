INSERT INTO banks (bank_name, active)
VALUES
    ('Bihar Gramin Bank', TRUE),
    ('State Bank of India', TRUE),
    ('HDFC Bank', TRUE),
    ('Punjab National Bank', TRUE),
    ('Bank of India', TRUE)
    ON CONFLICT (bank_name) DO NOTHING;