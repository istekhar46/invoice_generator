-- Shared inventory invariants unsupported by Prisma 7's schema language.
-- Run once, inside a transaction, after creating the inventory models.
-- The existing-DB upgrade includes this file with psql's relative \ir.

-- Cascades from a whole-account deletion may reach products/invoices before
-- actions. Check retained source references at commit, after all cascades finish.
ALTER TABLE "stock_actions" ALTER CONSTRAINT "stock_actions_userId_catalogItemId_fkey"
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "stock_actions" ALTER CONSTRAINT "stock_actions_userId_invoiceId_fkey"
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "stock_actions" ALTER CONSTRAINT "stock_actions_userId_reversalOfId_fkey"
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "stock_movements" ALTER CONSTRAINT "stock_movements_userId_catalogItemId_fkey"
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_stock_product_check"
  CHECK ("stockTrackingStartedAt" IS NULL OR "type" = 'PRODUCT');
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_issued_status_check"
  CHECK ("issuedAt" IS NULL OR "status" <> 'DRAFT');
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_action_input_check"
  CHECK (btrim("requestId") <> '' AND btrim("reason") <> ''
    AND "requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_action_source_check"
  CHECK (CASE "kind"
    WHEN 'OPENING' THEN "catalogItemId" IS NOT NULL AND "invoiceId" IS NULL
      AND "sourceKey" IS NOT NULL AND "sourceKey" = 'opening:' || "catalogItemId"
    WHEN 'ADJUSTMENT' THEN "catalogItemId" IS NOT NULL AND "invoiceId" IS NULL
      AND "sourceKey" IS NULL
    WHEN 'INVOICE_ISSUE' THEN "catalogItemId" IS NULL AND "invoiceId" IS NOT NULL
      AND "sourceKey" IS NOT NULL AND "sourceKey" = 'invoice:' || "invoiceId" || ':issue'
    WHEN 'INVOICE_EDIT' THEN "catalogItemId" IS NULL AND "invoiceId" IS NOT NULL
      AND "sourceKey" IS NULL
    WHEN 'INVOICE_VOID' THEN "catalogItemId" IS NULL AND "invoiceId" IS NOT NULL
      AND "sourceKey" IS NOT NULL AND "sourceKey" = 'invoice:' || "invoiceId" || ':void'
    ELSE false END);
ALTER TABLE "stock_actions" ADD CONSTRAINT "stock_action_reversal_check"
  CHECK ("reversalOfId" IS NULL OR
    ("reversalOfId" <> "id" AND "kind" IN ('ADJUSTMENT', 'INVOICE_VOID')));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_finite_check"
  CHECK ("quantityDelta" <> 'NaN'::numeric);

CREATE FUNCTION inventory_validate_action_source() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE product public.catalog_items%ROWTYPE;
BEGIN
  IF NEW."catalogItemId" IS NOT NULL THEN
    SELECT * INTO product FROM public.catalog_items
      WHERE "id" = NEW."catalogItemId" AND "userId" = NEW."userId";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock source product not found in this account.' USING ERRCODE = '23503';
    END IF;
    IF product."type" <> 'PRODUCT' OR product."stockTrackingStartedAt" IS NULL THEN
      RAISE EXCEPTION 'Stock actions require a tracked product.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION inventory_validate_movement() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  action public.stock_actions%ROWTYPE;
  product public.catalog_items%ROWTYPE;
BEGIN
  SELECT * INTO action FROM public.stock_actions
    WHERE "id" = NEW."actionId" AND "userId" = NEW."userId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock action not found in this account.' USING ERRCODE = '23503';
  END IF;
  SELECT * INTO product FROM public.catalog_items
    WHERE "id" = NEW."catalogItemId" AND "userId" = NEW."userId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock product not found in this account.' USING ERRCODE = '23503';
  END IF;
  IF product."type" <> 'PRODUCT' OR product."stockTrackingStartedAt" IS NULL THEN
    RAISE EXCEPTION 'Stock movements require a tracked product.' USING ERRCODE = '23514';
  END IF;
  IF action."catalogItemId" IS NOT NULL AND action."catalogItemId" <> NEW."catalogItemId" THEN
    RAISE EXCEPTION 'Stock movement does not match its action product.' USING ERRCODE = '23514';
  END IF;
  IF (action."kind" = 'OPENING' AND NEW."quantityDelta" < 0)
    OR (action."kind" <> 'OPENING' AND NEW."quantityDelta" = 0)
    OR (action."kind" = 'INVOICE_ISSUE' AND NEW."quantityDelta" > 0)
    OR (action."kind" = 'INVOICE_VOID' AND NEW."quantityDelta" < 0) THEN
    RAISE EXCEPTION 'Stock movement direction does not match its action.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Whole-account deletion retains the application's existing cascade contract.
-- Normal history changes must be represented by a new correction/reversal.
CREATE FUNCTION inventory_history_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE "id" = OLD."userId") THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'Stock history is append-only; record a correction action.' USING ERRCODE = '23514';
END;
$$;

CREATE FUNCTION inventory_tracking_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD."stockTrackingStartedAt" IS NOT NULL AND
    (NEW."stockTrackingStartedAt" IS DISTINCT FROM OLD."stockTrackingStartedAt"
      OR NEW."type" IS DISTINCT FROM OLD."type" OR NEW."unit" IS DISTINCT FROM OLD."unit") THEN
    RAISE EXCEPTION 'Tracking, product kind and unit are fixed once stock tracking starts.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION inventory_issue_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD."issuedAt" IS NOT NULL AND NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt" THEN
    RAISE EXCEPTION 'The original invoice issue time cannot change.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stock_action_source BEFORE INSERT ON "stock_actions"
  FOR EACH ROW EXECUTE FUNCTION inventory_validate_action_source();
CREATE TRIGGER stock_movement_source BEFORE INSERT ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION inventory_validate_movement();
CREATE TRIGGER stock_action_append_only BEFORE UPDATE OR DELETE ON "stock_actions"
  FOR EACH ROW EXECUTE FUNCTION inventory_history_immutable();
CREATE TRIGGER stock_action_no_truncate BEFORE TRUNCATE ON "stock_actions"
  FOR EACH STATEMENT EXECUTE FUNCTION inventory_history_immutable();
CREATE TRIGGER stock_movement_append_only BEFORE UPDATE OR DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION inventory_history_immutable();
CREATE TRIGGER stock_movement_no_truncate BEFORE TRUNCATE ON "stock_movements"
  FOR EACH STATEMENT EXECUTE FUNCTION inventory_history_immutable();
CREATE TRIGGER catalog_tracking_identity BEFORE UPDATE ON "catalog_items"
  FOR EACH ROW EXECUTE FUNCTION inventory_tracking_identity();
CREATE TRIGGER invoice_issue_identity BEFORE UPDATE OF "issuedAt" ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION inventory_issue_identity();
