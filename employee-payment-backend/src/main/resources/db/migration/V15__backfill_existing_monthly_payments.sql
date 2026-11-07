
-- V15: Backfill existing payments into monthly details and reservations.
-- Preserve all existing payment IDs, amounts, and statuses.

INSERT INTO payment_monthly_details (
    payment_id,
    payment_period_id,
    running_ta,
    fixed_ta,
    other,
    gross_total,
    miscellaneous,
    advance_ta,
    advance_other,
    deduction_total,
    net_payment,
    created_at,
    updated_at
)
SELECT
    p.id,
    p.payment_period_id,
    p.running_ta,
    p.fixed_ta,
    p.other,
    p.gross_total,
    p.miscellaneous,
    p.advance_ta,
    p.advance_other,
    p.deduction_total,
    p.net_payment,
    p.created_at,
    p.updated_at
FROM payments p;

-- Approved payments permanently reserve their employee-month.
-- Draft payments reserve their employee-month until cancelled or approved.

INSERT INTO payment_month_reservations (
    employee_id,
    payment_period_id,
    payment_id,
    status,
    created_at,
    released_at
)
SELECT
    p.employee_id,
    p.payment_period_id,
    p.id,
    CASE
        WHEN p.status = 'APPROVED' THEN 'PAID'
        ELSE 'RESERVED'
        END,
    p.created_at,
    NULL
FROM payments p;
