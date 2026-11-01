-- Upgrade an existing Invoiceo database from the pre-editor schema. Run once.
BEGIN;

-- DropIndex
DROP INDEX "invoices_invoiceNumber_key";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN     "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "logoDataUrl" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "purchaseOrderNumber" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "terms" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_userId_invoiceNumber_key" ON "invoices"("userId", "invoiceNumber");

-- Existing paid invoices were already settled before amount tracking existed.
UPDATE "invoices" SET "amountPaid" = "total" WHERE "status" = 'PAID';

COMMIT;
