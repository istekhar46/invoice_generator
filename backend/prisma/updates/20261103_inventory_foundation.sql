-- One-time upgrade from the catalog schema. Back up and stop writes first.
-- Apply with psql -X -v ON_ERROR_STOP=1 -f <this-file>; keep the shared
-- constraints directory beside updates. No inventory is enabled or backfilled.
-- Do not apply this file after a fresh schema push or before the catalog upgrade.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_temp;
LOCK TABLE "invoices", "catalog_items" IN ACCESS EXCLUSIVE MODE;

-- CreateEnum
CREATE TYPE "StockActionKind" AS ENUM ('OPENING', 'ADJUSTMENT', 'INVOICE_ISSUE', 'INVOICE_EDIT', 'INVOICE_VOID');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "issuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "stockTrackingStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stock_actions" (
    "id" TEXT NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "kind" "StockActionKind" NOT NULL,
    "sourceKey" VARCHAR(160),
    "catalogItemId" TEXT,
    "invoiceId" TEXT,
    "reversalOfId" TEXT,
    "reason" VARCHAR(500) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantityDelta" DECIMAL(18,3) NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_actions_sequence_key" ON "stock_actions"("sequence");

-- CreateIndex
CREATE INDEX "stock_actions_userId_sequence_idx" ON "stock_actions"("userId", "sequence");

-- CreateIndex
CREATE INDEX "stock_actions_userId_catalogItemId_idx" ON "stock_actions"("userId", "catalogItemId");

-- CreateIndex
CREATE INDEX "stock_actions_userId_invoiceId_idx" ON "stock_actions"("userId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actions_userId_id_key" ON "stock_actions"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actions_userId_requestId_key" ON "stock_actions"("userId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actions_userId_sourceKey_key" ON "stock_actions"("userId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actions_userId_reversalOfId_key" ON "stock_actions"("userId", "reversalOfId");

-- CreateIndex
CREATE INDEX "stock_movements_userId_catalogItemId_idx" ON "stock_movements"("userId", "catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_actionId_catalogItemId_key" ON "stock_movements"("actionId", "catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_userId_id_key" ON "invoices"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_userId_id_key" ON "catalog_items"("userId", "id");

-- AddForeignKey
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_actions_userId_catalogItemId_fkey" FOREIGN KEY ("userId", "catalogItemId") REFERENCES "catalog_items"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_actions_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId") REFERENCES "invoices"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_actions_userId_reversalOfId_fkey" FOREIGN KEY ("userId", "reversalOfId") REFERENCES "stock_actions"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_actionId_fkey" FOREIGN KEY ("userId", "actionId") REFERENCES "stock_actions"("userId", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_catalogItemId_fkey" FOREIGN KEY ("userId", "catalogItemId") REFERENCES "catalog_items"("userId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

\ir ../constraints/inventory.sql
COMMIT;
