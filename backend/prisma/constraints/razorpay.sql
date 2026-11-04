-- Install once after current models and inventory/payment invariants exist.
ALTER TABLE gateway_links ALTER CONSTRAINT "gateway_links_userId_invoiceId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_links ALTER CONSTRAINT "gateway_links_userId_connectionId_mode_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_link_requests ALTER CONSTRAINT "gateway_link_requests_userId_linkId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_payments ALTER CONSTRAINT "gateway_payments_userId_invoiceId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_payments ALTER CONSTRAINT "gateway_payments_userId_invoiceId_linkId_connectionId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_refunds ALTER CONSTRAINT "gateway_refunds_userId_invoiceId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE gateway_refunds ALTER CONSTRAINT "gateway_refunds_userId_invoiceId_paymentId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payment_entries ALTER CONSTRAINT "payment_entries_userId_invoiceId_gatewayPaymentId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payment_entries ALTER CONSTRAINT "payment_entries_userId_invoiceId_gatewayRefundId_fkey" DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE gateway_links ADD CONSTRAINT gateway_link_values CHECK (
  "amountMinor" BETWEEN 1 AND 9007199254740991
  AND "referenceId" ~ '^[A-Za-z0-9_-]{1,40}$'
  AND ((state IN ('PENDING','ACTIVE','UNKNOWN','CANCELLING') AND "activeKey" IS NOT NULL AND "activeKey"=mode::text||':'||"invoiceId")
    OR (state IN ('PAID','CANCELLED','EXPIRED','FAILED') AND "activeKey" IS NULL))
  AND (state <> 'ACTIVE' OR ("providerId" IS NOT NULL AND url IS NOT NULL))
  AND (url IS NULL OR (length(url)<=500 AND url ~ '^https://rzp[.]io/')));
ALTER TABLE gateway_payments ADD CONSTRAINT gateway_payment_values CHECK (
  "receivedMinor" BETWEEN 1 AND 9007199254740991 AND "appliedMinor" BETWEEN 0 AND "receivedMinor"
  AND currency ~ '^[A-Z]{3}$' AND "providerId" ~ '^pay_[A-Za-z0-9]+$');
ALTER TABLE gateway_refunds ADD CONSTRAINT gateway_refund_values CHECK (
  "amountMinor" BETWEEN 1 AND 9007199254740991 AND "appliedMinor" BETWEEN 0 AND "amountMinor"
  AND status IN ('pending','processed','failed') AND (status='processed' OR "appliedMinor"=0)
  AND "providerId" ~ '^rfnd_[A-Za-z0-9]+$');
ALTER TABLE gateway_webhook_events ADD CONSTRAINT gateway_webhook_values CHECK (
  digest ~ '^[a-f0-9]{64}$' AND "providerEventId" ~ '^[A-Za-z0-9_-]{1,200}$' AND outcome IN ('SYNCED','IGNORED'));
ALTER TABLE gateway_link_requests ADD CONSTRAINT gateway_request_id_check CHECK ("requestId" ~ '^[A-Za-z0-9_-]{1,100}$');
CREATE TRIGGER gateway_request_immutable BEFORE UPDATE OR DELETE ON gateway_link_requests FOR EACH ROW EXECUTE FUNCTION payment_history_immutable();
CREATE TRIGGER gateway_request_no_truncate BEFORE TRUNCATE ON gateway_link_requests FOR EACH STATEMENT EXECUTE FUNCTION payment_history_immutable();

CREATE FUNCTION gateway_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE inv public.invoices%ROWTYPE;
BEGIN
  IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Payment link history cannot be truncated.' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN
    IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=OLD."userId") THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Payment link history is retained.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-ARRAY['state','providerId','orderId','url','activeKey','lastError','createAttemptedAt','synchronizedAt','updatedAt']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['state','providerId','orderId','url','activeKey','lastError','createAttemptedAt','synchronizedAt','updatedAt'])
       OR (OLD."providerId" IS NOT NULL AND NEW."providerId" IS DISTINCT FROM OLD."providerId")
       OR (OLD."orderId" IS NOT NULL AND NEW."orderId" IS DISTINCT FROM OLD."orderId") THEN
      RAISE EXCEPTION 'Payment link identity and original charges are fixed.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO inv FROM public.invoices WHERE id=NEW."invoiceId" AND "userId"=NEW."userId" FOR UPDATE;
  IF NOT FOUND OR inv.status<>'SENT' OR inv.currency<>'INR' OR NEW.state<>'PENDING'
    OR NEW."amountMinor"<>public.payment_minor(inv.total,'INR')-public.payment_minor(inv."amountPaid",'INR') THEN
    RAISE EXCEPTION 'A payment link requires an issued INR invoice and its current balance.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gateway_link_identity BEFORE INSERT OR UPDATE OR DELETE ON gateway_links FOR EACH ROW EXECUTE FUNCTION gateway_link_guard();
CREATE TRIGGER gateway_link_no_truncate BEFORE TRUNCATE ON gateway_links FOR EACH STATEMENT EXECUTE FUNCTION gateway_link_guard();

CREATE FUNCTION gateway_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE inv public.invoices%ROWTYPE; link public.gateway_links%ROWTYPE; payment public.gateway_payments%ROWTYPE; paid numeric;
BEGIN
  IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Gateway money history cannot be truncated.' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN
    IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=OLD."userId") THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Gateway money history is retained.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME<>'gateway_refunds' THEN RAISE EXCEPTION 'Provider capture facts are immutable.' USING ERRCODE='23514'; END IF;
    IF OLD.status='processed' OR (to_jsonb(NEW)-ARRAY['status','appliedMinor','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','appliedMinor','updatedAt']) THEN
      RAISE EXCEPTION 'Processed refunds and original provider facts are immutable.' USING ERRCODE='23514';
    END IF;
  END IF;
  SELECT * INTO inv FROM public.invoices WHERE id=NEW."invoiceId" AND "userId"=NEW."userId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gateway invoice not found in this account.' USING ERRCODE='23503'; END IF;
  IF TG_TABLE_NAME='gateway_payments' THEN
    SELECT * INTO link FROM public.gateway_links WHERE id=NEW."linkId" AND "userId"=NEW."userId" AND "invoiceId"=NEW."invoiceId" AND "connectionId"=NEW."connectionId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Gateway link does not own this payment.' USING ERRCODE='23503'; END IF;
    SELECT COALESCE(sum("amountMinor"),0) INTO paid FROM public.payment_entries WHERE "invoiceId"=inv.id AND "userId"=inv."userId";
    IF NEW."appliedMinor">0 AND (link.mode<>'LIVE' OR NEW.currency<>'INR' OR NEW.method<>'upi' OR inv.currency<>'INR' OR inv.status<>'SENT'
      OR NEW."appliedMinor">public.payment_minor(inv.total,'INR')-paid) THEN
      RAISE EXCEPTION 'Only verified Live UPI funds within the current balance may be applied.' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT * INTO payment FROM public.gateway_payments WHERE id=NEW."paymentId" AND "userId"=NEW."userId" AND "invoiceId"=NEW."invoiceId";
    IF NOT FOUND OR NEW."connectionId"<>payment."connectionId" THEN RAISE EXCEPTION 'Refund payment ownership differs.' USING ERRCODE='23503'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gateway_payment_source BEFORE INSERT OR UPDATE OR DELETE ON gateway_payments FOR EACH ROW EXECUTE FUNCTION gateway_source_guard();
CREATE TRIGGER gateway_payment_no_truncate BEFORE TRUNCATE ON gateway_payments FOR EACH STATEMENT EXECUTE FUNCTION gateway_source_guard();
CREATE TRIGGER gateway_refund_source BEFORE INSERT OR UPDATE OR DELETE ON gateway_refunds FOR EACH ROW EXECUTE FUNCTION gateway_source_guard();
CREATE TRIGGER gateway_refund_no_truncate BEFORE TRUNCATE ON gateway_refunds FOR EACH STATEMENT EXECUTE FUNCTION gateway_source_guard();

ALTER TABLE payment_entries DROP CONSTRAINT payment_entry_kind_check;
ALTER TABLE payment_entries ADD CONSTRAINT payment_entry_kind_check CHECK (
  CASE kind
    WHEN 'OPENING' THEN "amountMinor">0 AND "openingSource" IS NOT NULL AND "openingSource" IN ('MIGRATION','GUEST_IMPORT') AND "openingKey" IS NOT NULL AND "openingKey"="invoiceId"
      AND "paymentDate" IS NULL AND reference IS NULL AND "reversalOfId" IS NULL AND "requestHash" IS NULL AND "gatewayPaymentId" IS NULL AND "gatewayRefundId" IS NULL
    WHEN 'UPI' THEN "amountMinor">0 AND currency='INR' AND "paymentDate" IS NOT NULL AND "openingSource" IS NULL AND "openingKey" IS NULL AND "reversalOfId" IS NULL
      AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[a-f0-9]{64}$' AND "gatewayPaymentId" IS NULL AND "gatewayRefundId" IS NULL
    WHEN 'REVERSAL' THEN "amountMinor"<0 AND "paymentDate" IS NOT NULL AND btrim(notes)<>'' AND "openingSource" IS NULL AND "openingKey" IS NULL AND reference IS NULL
      AND "reversalOfId" IS NOT NULL AND "reversalOfId"<>id AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[a-f0-9]{64}$' AND "gatewayPaymentId" IS NULL AND "gatewayRefundId" IS NULL
    WHEN 'RAZORPAY' THEN "amountMinor">0 AND currency='INR' AND "paymentDate" IS NOT NULL AND "openingSource" IS NULL AND "openingKey" IS NULL AND "reversalOfId" IS NULL
      AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[a-f0-9]{64}$' AND "gatewayPaymentId" IS NOT NULL AND "gatewayRefundId" IS NULL
    WHEN 'REFUND' THEN "amountMinor"<0 AND currency='INR' AND "paymentDate" IS NOT NULL AND "openingSource" IS NULL AND "openingKey" IS NULL AND "reversalOfId" IS NULL
      AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[a-f0-9]{64}$' AND "gatewayPaymentId" IS NULL AND "gatewayRefundId" IS NOT NULL
    ELSE false END);

CREATE OR REPLACE FUNCTION payment_entry_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE inv public.invoices%ROWTYPE; original public.payment_entries%ROWTYPE; payment public.gateway_payments%ROWTYPE; refund public.gateway_refunds%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id=NEW."invoiceId" AND "userId"=NEW."userId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment invoice not found in this account.' USING ERRCODE='23503'; END IF;
  IF inv.currency<>NEW.currency THEN RAISE EXCEPTION 'Payment currency differs from invoice.' USING ERRCODE='23514'; END IF;
  IF inv.status='VOIDED' OR (NEW.kind='UPI' AND inv.status<>'SENT') THEN RAISE EXCEPTION 'Payments require a non-void issued invoice.' USING ERRCODE='23514'; END IF;
  IF NEW.kind IN ('OPENING','UPI','REVERSAL') AND EXISTS(SELECT 1 FROM public.gateway_links WHERE "userId"=inv."userId" AND "invoiceId"=inv.id AND mode='LIVE' AND "activeKey" IS NOT NULL) THEN
    RAISE EXCEPTION 'Resolve the active Live payment link before manual payment changes.' USING ERRCODE='23514';
  END IF;
  IF NEW.kind='REVERSAL' THEN
    SELECT * INTO original FROM public.payment_entries WHERE id=NEW."reversalOfId" AND "userId"=NEW."userId" AND "invoiceId"=NEW."invoiceId";
    IF NOT FOUND OR original.kind NOT IN ('OPENING','UPI') OR NEW."amountMinor"<>-original."amountMinor" THEN RAISE EXCEPTION 'Only an original manual receipt or opening may be reversed in full.' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='RAZORPAY' THEN
    SELECT * INTO payment FROM public.gateway_payments WHERE id=NEW."gatewayPaymentId" AND "userId"=NEW."userId" AND "invoiceId"=NEW."invoiceId";
    IF NOT FOUND OR NEW."amountMinor"<>payment."appliedMinor" THEN RAISE EXCEPTION 'Gateway receipt must match its provider source.' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='REFUND' THEN
    SELECT * INTO refund FROM public.gateway_refunds WHERE id=NEW."gatewayRefundId" AND "userId"=NEW."userId" AND "invoiceId"=NEW."invoiceId";
    IF NOT FOUND OR refund.status<>'processed' OR NEW."amountMinor"<>-refund."appliedMinor" THEN RAISE EXCEPTION 'Gateway refund must match its processed provider source.' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION payment_currency_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency AND (EXISTS(SELECT 1 FROM public.payment_entries WHERE "userId"=OLD."userId" AND "invoiceId"=OLD.id)
    OR EXISTS(SELECT 1 FROM public.gateway_payments p JOIN public.gateway_links l ON l.id=p."linkId" WHERE p."userId"=OLD."userId" AND p."invoiceId"=OLD.id AND l.mode='LIVE')) THEN
    RAISE EXCEPTION 'Invoice currency is fixed after payment history exists.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION gateway_invoice_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF (NEW.total IS DISTINCT FROM OLD.total OR NEW.currency IS DISTINCT FROM OLD.currency OR (NEW.status='VOIDED' AND OLD.status<>'VOIDED'))
    AND EXISTS(SELECT 1 FROM public.gateway_links WHERE "userId"=OLD."userId" AND "invoiceId"=OLD.id AND mode='LIVE' AND "activeKey" IS NOT NULL) THEN
    RAISE EXCEPTION 'Resolve the active Live payment link before changing invoice charges or voiding.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gateway_invoice_financial_guard BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION gateway_invoice_guard();

CREATE FUNCTION gateway_ledger_check() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE target text; payment public.gateway_payments%ROWTYPE; receipt numeric; refunded numeric; applied numeric; invalid_refund boolean;
BEGIN
  IF TG_TABLE_NAME='gateway_payments' THEN target:=NEW.id;
  ELSIF TG_TABLE_NAME='gateway_refunds' THEN target:=NEW."paymentId";
  ELSE
    target:=NEW."gatewayPaymentId";
    IF target IS NULL AND NEW."gatewayRefundId" IS NOT NULL THEN SELECT "paymentId" INTO target FROM public.gateway_refunds WHERE id=NEW."gatewayRefundId"; END IF;
  END IF;
  IF target IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO payment FROM public.gateway_payments WHERE id=target;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(sum("amountMinor"),0) INTO receipt FROM public.payment_entries WHERE "gatewayPaymentId"=target;
  SELECT COALESCE(sum("amountMinor") FILTER(WHERE status='processed'),0),COALESCE(sum("appliedMinor"),0) INTO refunded,applied FROM public.gateway_refunds WHERE "paymentId"=target;
  SELECT EXISTS(SELECT 1 FROM public.gateway_refunds r WHERE r."paymentId"=target AND r."appliedMinor"<>-COALESCE((SELECT sum(e."amountMinor") FROM public.payment_entries e WHERE e."gatewayRefundId"=r.id),0)) INTO invalid_refund;
  IF receipt<>payment."appliedMinor" OR refunded>payment."receivedMinor" OR applied<>greatest(0,refunded-(payment."receivedMinor"-payment."appliedMinor")) OR invalid_refund THEN
    RAISE EXCEPTION 'Provider received/applied/refund sources must reconcile with the invoice ledger; refund excess first.' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER gateway_payment_ledger AFTER INSERT ON gateway_payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gateway_ledger_check();
CREATE CONSTRAINT TRIGGER gateway_refund_ledger AFTER INSERT OR UPDATE ON gateway_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gateway_ledger_check();
CREATE CONSTRAINT TRIGGER gateway_entry_ledger AFTER INSERT ON payment_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gateway_ledger_check();
