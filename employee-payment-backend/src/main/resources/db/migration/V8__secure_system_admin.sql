-- Promote the initial admin account to SYSTEM_ADMIN.
-- This allows the initial administrator to manage other administrators.

UPDATE admins
SET role = 'SYSTEM_ADMIN'
WHERE LOWER(username) = 'admin'
  AND role <> 'SYSTEM_ADMIN';