-- One-time payment receipt upgrade after 20261103_invoice_inventory.sql.
-- Existing paid amounts become labeled, unknown-date opening balances.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE "invoices" IN SHARE ROW EXCLUSIVE MODE;
-- CreateEnum
CREATE TYPE "PaymentEntryKind" AS ENUM ('OPENING', 'UPI', 'REVERSAL');

-- CreateTable
CREATE TABLE "payment_entries" (
    "id" TEXT NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT,
    "kind" "PaymentEntryKind" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "openingSource" TEXT,
    "openingKey" TEXT,
    "paymentDate" DATE,
    "reference" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_sequence_key" ON "payment_entries"("sequence");

-- CreateIndex
CREATE INDEX "payment_entries_userId_sequence_idx" ON "payment_entries"("userId", "sequence");

-- CreateIndex
CREATE INDEX "payment_entries_userId_invoiceId_sequence_idx" ON "payment_entries"("userId", "invoiceId", "sequence");

-- CreateIndex
CREATE INDEX "payment_entries_userId_paymentDate_idx" ON "payment_entries"("userId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_requestId_key" ON "payment_entries"("userId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_openingKey_key" ON "payment_entries"("userId", "openingKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_invoiceId_id_key" ON "payment_entries"("userId", "invoiceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_invoiceId_reversalOfId_key" ON "payment_entries"("userId", "invoiceId", "reversalOfId");

-- AddForeignKey
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entries_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId") REFERENCES "invoices"("userId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entries_userId_invoiceId_reversalOfId_fkey" FOREIGN KEY ("userId", "invoiceId", "reversalOfId") REFERENCES "payment_entries"("userId", "invoiceId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;


\ir ../constraints/payments.sql

DO $$
DECLARE inv record; paid bigint; totalMinor bigint;
BEGIN
  FOR inv IN SELECT "id", "currency", "amountPaid", "total", "status" FROM "invoices" LOOP
    paid := payment_minor(inv."amountPaid", inv."currency");
    totalMinor := payment_minor(inv."total", inv."currency");
    IF paid > totalMinor OR (inv."status" = 'VOIDED' AND paid <> 0) THEN
      RAISE EXCEPTION 'Resolve invalid paid balance on invoice % before upgrading.', inv."id";
    END IF;
  END LOOP;
END;
$$;

INSERT INTO "payment_entries" ("id","userId","invoiceId","requestId","kind","amountMinor","currency","openingSource","openingKey","notes")
SELECT 'opening_' || "id", "userId", "id", 'opening_' || md5("id"), 'OPENING', payment_minor("amountPaid","currency"), "currency", 'MIGRATION', "id",
  'Existing recorded paid balance. Payment method and date are unknown.'
FROM "invoices" WHERE payment_minor("amountPaid","currency") > 0 ORDER BY "id";

-- Paid amounts are authoritative, not old labels; do not infer a payment from PAID.
-- Preserve zero-total issued labels and Draft/Voided lifecycle/stock cutover fields.
UPDATE "invoices" SET
  "status" = CASE WHEN "status" IN ('SENT','PAID') AND payment_minor("total","currency") > 0
    THEN CASE WHEN payment_minor("amountPaid","currency") = payment_minor("total","currency")
      THEN 'PAID'::"InvoiceStatus" ELSE 'SENT'::"InvoiceStatus" END ELSE "status" END,
  "amountPaid" = payment_minor("amountPaid","currency")::double precision / payment_currency_scale("currency");
COMMIT;
