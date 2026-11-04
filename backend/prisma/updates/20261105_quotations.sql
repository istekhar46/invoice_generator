-- Additive quotations/account numbering upgrade. Apply once with psql -v ON_ERROR_STOP=1.
BEGIN;
-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "sourceQuoteId" TEXT;

-- CreateTable
CREATE TABLE "document_counters" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("userId","kind")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "clientRequestId" VARCHAR(100) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "quoteDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "companySnapshot" JSONB NOT NULL,
    "customerSnapshot" JSONB NOT NULL,
    "logoDataUrl" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "purchaseOrderNumber" TEXT NOT NULL DEFAULT '',
    "shippingAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "LineItemType" NOT NULL,
    "catalogItemId" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_numbers" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_numbers_pkey" PRIMARY KEY ("userId","kind","number")
);

-- CreateIndex
CREATE INDEX "quotes_userId_status_createdAt_idx" ON "quotes"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_userId_id_key" ON "quotes"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_userId_quoteNumber_key" ON "quotes"("userId", "quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_userId_clientRequestId_key" ON "quotes"("userId", "clientRequestId");

-- CreateIndex
CREATE INDEX "quote_line_items_userId_catalogItemId_idx" ON "quote_line_items"("userId", "catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_line_items_quoteId_position_key" ON "quote_line_items"("quoteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_userId_sourceQuoteId_key" ON "invoices"("userId", "sourceQuoteId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_sourceQuoteId_fkey" FOREIGN KEY ("userId", "sourceQuoteId") REFERENCES "quotes"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_counters" ADD CONSTRAINT "document_counters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_userId_quoteId_fkey" FOREIGN KEY ("userId", "quoteId") REFERENCES "quotes"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_userId_catalogItemId_fkey" FOREIGN KEY ("userId", "catalogItemId") REFERENCES "catalog_items"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_numbers" ADD CONSTRAINT "document_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Preserve every existing invoice field; retain all existing numbers and seed numeric sequences.
INSERT INTO document_counters ("userId",kind,value)
SELECT "userId",'INVOICE',MAX(substring("invoiceNumber" FROM 5)::bigint)
FROM invoices WHERE "invoiceNumber" ~ '^INV-[0-9]{6,18}$' GROUP BY "userId";
INSERT INTO document_numbers ("userId",kind,number,"documentId")
SELECT "userId",'INVOICE',"invoiceNumber",id FROM invoices;
\ir ../constraints/quotations.sql
COMMIT;
