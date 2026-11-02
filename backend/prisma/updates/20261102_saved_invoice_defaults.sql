-- Run once after the quick-editor schema upgrade. No invoice data is modified.
BEGIN;
CREATE TABLE "invoice_defaults" (
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "taxRate" DOUBLE PRECISION NOT NULL,
  "paymentTerms" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "terms" TEXT NOT NULL,
  CONSTRAINT "invoice_defaults_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "invoice_defaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
COMMIT;
