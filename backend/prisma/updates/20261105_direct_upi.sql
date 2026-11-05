-- Additive upgrade; apply once with ON_ERROR_STOP=1, before deploying the API.
BEGIN;
CREATE TABLE "upi_payment_preferences" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "upiId" VARCHAR(255) NOT NULL,
  "payeeName" VARCHAR(80) NOT NULL
);
ALTER TABLE "invoices"
  ADD COLUMN "directUpiId" VARCHAR(255),
  ADD COLUMN "directUpiPayeeName" VARCHAR(80),
  ADD COLUMN "directUpiReference" VARCHAR(32);
\ir ../constraints/direct-upi.sql
COMMIT;
