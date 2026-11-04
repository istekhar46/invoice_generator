-- Quote retention and frozen issued commercial snapshots; install after schema creation.
ALTER TABLE invoices ALTER CONSTRAINT "invoices_userId_sourceQuoteId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quotes ALTER CONSTRAINT "quotes_customerId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_line_items ALTER CONSTRAINT "quote_line_items_userId_catalogItemId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE document_counters ADD CONSTRAINT document_counter_valid CHECK (kind IN ('INVOICE','QUOTE') AND value >= 0);
ALTER TABLE document_numbers ADD CONSTRAINT document_number_valid CHECK (kind IN ('INVOICE','QUOTE') AND btrim(number)<>'' AND btrim("documentId")<>'');
ALTER TABLE quotes ADD CONSTRAINT quote_dates_version_valid CHECK ("validUntil">="quoteDate" AND version>0 AND btrim("quoteNumber")<>'' AND "requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE quotes ADD CONSTRAINT quote_status_timestamps_valid CHECK (
  (status='DRAFT' AND "issuedAt" IS NULL AND "acceptedAt" IS NULL) OR
  (status IN ('ISSUED','DECLINED') AND "issuedAt" IS NOT NULL AND "acceptedAt" IS NULL) OR
  (status='ACCEPTED' AND "issuedAt" IS NOT NULL AND "acceptedAt" IS NOT NULL) OR status='CANCELLED');

CREATE FUNCTION quotation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS(SELECT 1 FROM public.users WHERE id=OLD."userId") THEN
      RAISE EXCEPTION 'Retain quotations; cancel instead of deleting.' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id<>OLD.id OR NEW."userId"<>OLD."userId" OR NEW."quoteNumber"<>OLD."quoteNumber" OR NEW."clientRequestId"<>OLD."clientRequestId" OR NEW."requestHash"<>OLD."requestHash" THEN
    RAISE EXCEPTION 'Quotation identity is immutable.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.invoices WHERE "userId"=OLD."userId" AND "sourceQuoteId"=OLD.id) THEN
    RAISE EXCEPTION 'A converted quotation is immutable.' USING ERRCODE='23514';
  END IF;
  IF OLD.status<>'DRAFT' AND (to_jsonb(NEW)-ARRAY['status','version','updatedAt','acceptedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version','updatedAt','acceptedAt']) THEN
    RAISE EXCEPTION 'Issued quotation content is immutable.' USING ERRCODE='23514';
  END IF;
  IF NEW.status<>OLD.status AND NOT (
    (OLD.status='DRAFT' AND NEW.status IN ('ISSUED','CANCELLED')) OR
    (OLD.status='ISSUED' AND NEW.status IN ('ACCEPTED','DECLINED','CANCELLED')) OR
    (OLD.status='ACCEPTED' AND NEW.status='CANCELLED')) THEN
    RAISE EXCEPTION 'Invalid quotation status transition.' USING ERRCODE='23514';
  END IF;
  IF OLD."acceptedAt" IS NOT NULL AND NEW."acceptedAt" IS DISTINCT FROM OLD."acceptedAt" THEN
    RAISE EXCEPTION 'Quotation acceptance timestamp is immutable.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quotation_retention BEFORE UPDATE OR DELETE ON quotes FOR EACH ROW EXECUTE FUNCTION quotation_guard();

CREATE FUNCTION quotation_line_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE row_user text; row_quote text; parent_status public."QuoteStatus";
BEGIN
  row_user:=CASE WHEN TG_OP='DELETE' THEN OLD."userId" ELSE NEW."userId" END;
  row_quote:=CASE WHEN TG_OP='DELETE' THEN OLD."quoteId" ELSE NEW."quoteId" END;
  IF TG_OP='UPDATE' AND (NEW."quoteId"<>OLD."quoteId" OR NEW."userId"<>OLD."userId") THEN
    RAISE EXCEPTION 'Quotation line ownership is immutable.' USING ERRCODE='23514';
  END IF;
  SELECT status INTO parent_status FROM public.quotes WHERE id=row_quote AND "userId"=row_user FOR UPDATE;
  IF FOUND AND parent_status<>'DRAFT' AND EXISTS(SELECT 1 FROM public.users WHERE id=row_user) THEN
    RAISE EXCEPTION 'Issued quotation lines are immutable.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER quotation_lines_frozen BEFORE INSERT OR UPDATE OR DELETE ON quote_line_items FOR EACH ROW EXECUTE FUNCTION quotation_line_guard();

CREATE FUNCTION quotation_invoice_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE source public.quotes%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD."sourceQuoteId" IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE id=OLD."userId") THEN
      RAISE EXCEPTION 'Retain converted invoices; cancel or void instead.' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW."sourceQuoteId" IS DISTINCT FROM OLD."sourceQuoteId" THEN
      RAISE EXCEPTION 'Invoice quotation source is immutable.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW."sourceQuoteId" IS NOT NULL THEN
    SELECT * INTO source FROM public.quotes WHERE id=NEW."sourceQuoteId" AND "userId"=NEW."userId" FOR UPDATE;
    IF NOT FOUND OR source.status<>'ACCEPTED' OR source."validUntil"<(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      OR NEW.status<>'DRAFT' OR NEW."amountPaid"<>0 OR NEW."issuedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Conversion requires an accepted unexpired quotation and an unpaid draft invoice.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quotation_invoice_source BEFORE INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION quotation_invoice_guard();

CREATE FUNCTION quotation_customer_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id=NEW."customerId" AND "userId"=NEW."userId") THEN
    RAISE EXCEPTION 'Quotation customer must belong to the same account.' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quotation_owned_customer BEFORE INSERT OR UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION quotation_customer_owner();

-- Scalar document IDs intentionally survive draft deletion and invoice renumbering.
CREATE FUNCTION document_number_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.users WHERE id=OLD."userId") THEN
    RAISE EXCEPTION 'Used document numbers must be retained unchanged.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER document_number_retention BEFORE UPDATE OR DELETE ON document_numbers FOR EACH ROW EXECUTE FUNCTION document_number_guard();
