-- Commit new PostgreSQL enum labels before installing guards which use them.
-- Apply once after 20261104_razorpay_connections.sql, before the gateway models.
BEGIN;
SET LOCAL lock_timeout='10s';
ALTER TYPE "PaymentEntryKind" ADD VALUE 'RAZORPAY';
ALTER TYPE "PaymentEntryKind" ADD VALUE 'REFUND';
COMMIT;
