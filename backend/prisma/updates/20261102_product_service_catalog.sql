-- One-time upgrade from the saved-invoice-defaults schema. Stop application writes
-- and back up the target first; deploy the matching API/frontend together.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE "line_items" IN ACCESS EXCLUSIVE MODE;

ALTER TYPE "LineItemType" RENAME VALUE 'MATERIAL' TO 'PRODUCT';
ALTER TYPE "LineItemType" RENAME VALUE 'LABOR' TO 'SERVICE';

CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LineItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "unit" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalog_items_userId_sku_key" ON "catalog_items"("userId", "sku");
CREATE INDEX "catalog_items_userId_isArchived_name_idx" ON "catalog_items"("userId", "isArchived", "name");
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "line_items" ADD COLUMN "catalogItemId" TEXT;
CREATE INDEX "line_items_catalogItemId_idx" ON "line_items"("catalogItemId");
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_catalogItemId_fkey"
  FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
