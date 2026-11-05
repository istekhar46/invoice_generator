-- Additive public-invoice capability storage. Apply once with ON_ERROR_STOP=1.
BEGIN;
CREATE TABLE "invoice_shares" (
  "id" VARCHAR(43) NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_shares_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId")
    REFERENCES "invoices"("userId", "id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "invoice_shares_userId_invoiceId_key" ON "invoice_shares"("userId", "invoiceId");
COMMIT;
