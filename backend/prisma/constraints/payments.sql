-- Shared payment history/cache invariants. Install once after the models exist.
-- The one-time upgrade installs these before its transactional opening backfill.
-- Precision matches invoice-calculation currencyDigits, verified on Node 22/26.
CREATE FUNCTION payment_currency_scale(code text) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF code = ANY(ARRAY['AFN','ALL','BIF','CLP','COP','DJF','GNF','HUF','IDR','IQD','IRR','ISK','JPY','KMF','KPW','KRW','LAK','LBP','MGA','MMK','PKR','PYG','RWF','SLL','SOS','SYP','UGX','VND','VUV','XAF','XOF','XPF','YER']) THEN RETURN 1; END IF;
  IF code = ANY(ARRAY['BHD','JOD','KWD','LYD','OMR','TND']) THEN RETURN 1000; END IF;
  IF code = ANY(ARRAY['AED','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHF','CNY','CRC','CUC','CUP','CVE','CZK','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GTQ','GYD','HKD','HNL','HRK','HTG','ILS','INR','JMD','KES','KGS','KHR','KYD','KZT','LKR','LRD','LSL','MAD','MDL','MKD','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','PAB','PEN','PGK','PHP','PLN','QAR','RON','RSD','RUB','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SRD','SSP','STN','SVC','SZL','THB','TJS','TMT','TOP','TRY','TTD','TWD','TZS','UAH','USD','UYU','UZS','VES','WST','XCD','XCG','XDR','XSU','ZAR','ZMW','ZWG','ZWL']) THEN RETURN 100; END IF;
  RAISE EXCEPTION 'Unsupported invoice payment currency: %', code USING ERRCODE = '23514';
END;
$$;

-- Match the existing non-negative JS minor-unit rounding, including its epsilon.
CREATE FUNCTION payment_minor(value double precision, code text) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE scaled double precision; units double precision;
BEGIN
  IF value < 0 OR value::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Invalid invoice payment amount.' USING ERRCODE = '23514';
  END IF;
  scaled := (value + 2.220446049250313e-16::double precision * value) * public.payment_currency_scale(code);
  units := floor(scaled);
  IF scaled - units >= 0.5 THEN units := units + 1; END IF;
  IF units > 9007199254740991 THEN
    RAISE EXCEPTION 'Invoice payment amount exceeds supported precision.' USING ERRCODE = '23514';
  END IF;
  RETURN units::bigint;
END;
$$;

ALTER TABLE "payment_entries" ALTER CONSTRAINT "payment_entries_userId_invoiceId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "payment_entries" ALTER CONSTRAINT "payment_entries_userId_invoiceId_reversalOfId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entry_amount_check"
  CHECK ("amountMinor" <> 0 AND "amountMinor" BETWEEN -9007199254740991 AND 9007199254740991);
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entry_text_check"
  CHECK ("requestId" ~ '^[A-Za-z0-9_-]{1,100}$' AND length("notes") <= 1000
    AND ("reference" IS NULL OR (length("reference") <= 100 AND btrim("reference") <> '')));
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entry_kind_check" CHECK (
  CASE "kind"
    WHEN 'OPENING' THEN "amountMinor" > 0 AND "openingSource" IN ('MIGRATION','GUEST_IMPORT')
      AND "openingSource" IS NOT NULL AND "openingKey" = "invoiceId" AND "openingKey" IS NOT NULL
      AND "paymentDate" IS NULL AND "reference" IS NULL AND "reversalOfId" IS NULL AND "requestHash" IS NULL
    WHEN 'UPI' THEN "amountMinor" > 0 AND "currency" = 'INR' AND "paymentDate" IS NOT NULL
      AND "openingSource" IS NULL AND "openingKey" IS NULL AND "reversalOfId" IS NULL
      AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[0-9a-f]{64}$'
    WHEN 'REVERSAL' THEN "amountMinor" < 0 AND "paymentDate" IS NOT NULL AND btrim("notes") <> ''
      AND "openingSource" IS NULL AND "openingKey" IS NULL AND "reference" IS NULL
      AND "reversalOfId" IS NOT NULL AND "reversalOfId" <> "id"
      AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[0-9a-f]{64}$'
    ELSE false END);

CREATE FUNCTION payment_entry_validate() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE inv public.invoices%ROWTYPE; original public.payment_entries%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE "id" = NEW."invoiceId" AND "userId" = NEW."userId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment invoice not found in this account.' USING ERRCODE = '23503'; END IF;
  IF inv."currency" <> NEW."currency" THEN RAISE EXCEPTION 'Payment currency differs from invoice.' USING ERRCODE = '23514'; END IF;
  IF inv."status" = 'VOIDED' OR (NEW."kind" = 'UPI' AND inv."status" <> 'SENT') THEN
    RAISE EXCEPTION 'UPI receipts require an issued invoice with a balance.' USING ERRCODE = '23514';
  END IF;
  IF NEW."kind" = 'REVERSAL' THEN
    SELECT * INTO original FROM public.payment_entries WHERE "id" = NEW."reversalOfId"
      AND "userId" = NEW."userId" AND "invoiceId" = NEW."invoiceId";
    IF NOT FOUND OR original."kind" = 'REVERSAL' OR NEW."amountMinor" <> -original."amountMinor" THEN
      RAISE EXCEPTION 'A reversal must exactly negate an original payment.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION payment_history_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.users WHERE "id" = OLD."userId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Payment history is append-only; record a reversal.' USING ERRCODE = '23514';
END;
$$;

CREATE FUNCTION payment_currency_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW."currency" IS DISTINCT FROM OLD."currency" AND EXISTS (
    SELECT 1 FROM public.payment_entries WHERE "userId" = OLD."userId" AND "invoiceId" = OLD."id") THEN
    RAISE EXCEPTION 'Invoice currency is fixed after payment history exists.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION payment_invoice_reconcile() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE inv public.invoices%ROWTYPE; target text; paid numeric; total bigint;
BEGIN
  IF TG_TABLE_NAME = 'invoices' THEN target := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN target := OLD."invoiceId";
  ELSE target := NEW."invoiceId"; END IF;
  SELECT * INTO inv FROM public.invoices WHERE "id" = target;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(sum("amountMinor"),0) INTO paid FROM public.payment_entries WHERE "invoiceId" = inv."id" AND "userId" = inv."userId";
  total := public.payment_minor(inv."total",inv."currency");
  IF paid < 0 OR paid > total OR paid <> public.payment_minor(inv."amountPaid",inv."currency")
    OR inv."amountPaid" <> paid::double precision / public.payment_currency_scale(inv."currency") THEN
    RAISE EXCEPTION 'Invoice paid balance must match its payment history and total.' USING ERRCODE = '23514';
  END IF;
  IF inv."status" = 'VOIDED' AND paid <> 0 THEN RAISE EXCEPTION 'A paid invoice cannot be voided.' USING ERRCODE = '23514'; END IF;
  IF inv."status" IN ('SENT','PAID') AND total > 0 AND ((paid = total) <> (inv."status" = 'PAID')) THEN
    RAISE EXCEPTION 'Issued invoice payment status must match its balance.' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER payment_entry_source BEFORE INSERT ON "payment_entries" FOR EACH ROW EXECUTE FUNCTION payment_entry_validate();
CREATE TRIGGER payment_entry_append_only BEFORE UPDATE OR DELETE ON "payment_entries" FOR EACH ROW EXECUTE FUNCTION payment_history_immutable();
CREATE TRIGGER payment_entry_no_truncate BEFORE TRUNCATE ON "payment_entries" FOR EACH STATEMENT EXECUTE FUNCTION payment_history_immutable();
CREATE TRIGGER payment_invoice_currency BEFORE UPDATE OF "currency" ON "invoices" FOR EACH ROW EXECUTE FUNCTION payment_currency_identity();
CREATE CONSTRAINT TRIGGER payment_entry_balance AFTER INSERT OR UPDATE OR DELETE ON "payment_entries" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payment_invoice_reconcile();
CREATE CONSTRAINT TRIGGER payment_invoice_balance AFTER INSERT OR UPDATE ON "invoices" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION payment_invoice_reconcile();
