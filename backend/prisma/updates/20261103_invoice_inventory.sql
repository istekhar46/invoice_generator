-- One-time upgrade after 20261103_inventory_foundation.sql.
-- Commit the additive enum value before the matching API writes VOIDED invoices.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
ALTER TYPE "InvoiceStatus" ADD VALUE 'VOIDED';
COMMIT;
