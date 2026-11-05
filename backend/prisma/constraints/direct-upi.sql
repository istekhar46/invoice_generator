-- Install once on a fresh schema; the one-time upgrade installs the same checks.
ALTER TABLE "upi_payment_preferences" ADD CONSTRAINT "upi_preference_details_check"
  CHECK ("upiId" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$'
    AND btrim("payeeName") <> '' AND "payeeName" = btrim("payeeName"));
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_direct_upi_snapshot_check"
  CHECK (("directUpiId" IS NULL AND "directUpiPayeeName" IS NULL AND "directUpiReference" IS NULL)
    OR ("directUpiId" IS NOT NULL AND "directUpiPayeeName" IS NOT NULL AND "directUpiReference" IS NOT NULL
      AND "directUpiId" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$'
      AND btrim("directUpiPayeeName") <> '' AND "directUpiReference" ~ '^[a-f0-9]{32}$'));
