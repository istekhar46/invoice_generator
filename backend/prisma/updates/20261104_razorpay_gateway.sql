-- One-time gateway models after committed gateway payment kinds and merchant setup.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='60s';
-- CreateEnum
CREATE TYPE "GatewayLinkState" AS ENUM ('PENDING', 'ACTIVE', 'UNKNOWN', 'CANCELLING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED');

-- AlterTable
ALTER TABLE "razorpay_connections" ADD COLUMN     "webhookCiphertext" TEXT;

-- AlterTable
ALTER TABLE "payment_entries" ADD COLUMN     "gatewayPaymentId" TEXT,
ADD COLUMN     "gatewayRefundId" TEXT;

-- CreateTable
CREATE TABLE "gateway_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "mode" "RazorpayMode" NOT NULL,
    "referenceId" VARCHAR(40) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "activeKey" TEXT,
    "state" "GatewayLinkState" NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "orderId" TEXT,
    "url" TEXT,
    "lastError" TEXT,
    "createAttemptedAt" TIMESTAMP(3),
    "synchronizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_link_requests" (
    "userId" TEXT NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "linkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_link_requests_pkey" PRIMARY KEY ("userId","requestId")
);

-- CreateTable
CREATE TABLE "gateway_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "receivedMinor" BIGINT NOT NULL,
    "appliedMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "method" VARCHAR(32) NOT NULL,
    "exception" TEXT,
    "providerCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_refunds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "appliedMinor" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL,
    "providerCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_webhook_events" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerEventId" VARCHAR(200) NOT NULL,
    "digest" CHAR(64) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "outcome" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_webhook_secrets" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_webhook_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gateway_links_referenceId_key" ON "gateway_links"("referenceId");

-- CreateIndex
CREATE INDEX "gateway_links_userId_mode_createdAt_idx" ON "gateway_links"("userId", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "gateway_links_userId_invoiceId_createdAt_idx" ON "gateway_links"("userId", "invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "gateway_links_connectionId_orderId_idx" ON "gateway_links"("connectionId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_links_userId_id_key" ON "gateway_links"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_links_userId_activeKey_key" ON "gateway_links"("userId", "activeKey");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_links_connectionId_providerId_key" ON "gateway_links"("connectionId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_links_userId_invoiceId_id_connectionId_key" ON "gateway_links"("userId", "invoiceId", "id", "connectionId");

-- CreateIndex
CREATE INDEX "gateway_payments_userId_invoiceId_createdAt_idx" ON "gateway_payments"("userId", "invoiceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_payments_connectionId_providerId_key" ON "gateway_payments"("connectionId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_payments_userId_invoiceId_id_key" ON "gateway_payments"("userId", "invoiceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_refunds_connectionId_providerId_key" ON "gateway_refunds"("connectionId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_refunds_userId_invoiceId_id_key" ON "gateway_refunds"("userId", "invoiceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_webhook_events_connectionId_providerEventId_key" ON "gateway_webhook_events"("connectionId", "providerEventId");

-- CreateIndex
CREATE INDEX "gateway_webhook_secrets_connectionId_expiresAt_idx" ON "gateway_webhook_secrets"("connectionId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_connections_userId_id_mode_key" ON "razorpay_connections"("userId", "id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_invoiceId_gatewayPaymentId_key" ON "payment_entries"("userId", "invoiceId", "gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_entries_userId_invoiceId_gatewayRefundId_key" ON "payment_entries"("userId", "invoiceId", "gatewayRefundId");

-- AddForeignKey
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entries_userId_invoiceId_gatewayPaymentId_fkey" FOREIGN KEY ("userId", "invoiceId", "gatewayPaymentId") REFERENCES "gateway_payments"("userId", "invoiceId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payment_entries" ADD CONSTRAINT "payment_entries_userId_invoiceId_gatewayRefundId_fkey" FOREIGN KEY ("userId", "invoiceId", "gatewayRefundId") REFERENCES "gateway_refunds"("userId", "invoiceId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_links" ADD CONSTRAINT "gateway_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_links" ADD CONSTRAINT "gateway_links_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId") REFERENCES "invoices"("userId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_links" ADD CONSTRAINT "gateway_links_userId_connectionId_mode_fkey" FOREIGN KEY ("userId", "connectionId", "mode") REFERENCES "razorpay_connections"("userId", "id", "mode") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_link_requests" ADD CONSTRAINT "gateway_link_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_link_requests" ADD CONSTRAINT "gateway_link_requests_userId_linkId_fkey" FOREIGN KEY ("userId", "linkId") REFERENCES "gateway_links"("userId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_payments" ADD CONSTRAINT "gateway_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_payments" ADD CONSTRAINT "gateway_payments_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId") REFERENCES "invoices"("userId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_payments" ADD CONSTRAINT "gateway_payments_userId_invoiceId_linkId_connectionId_fkey" FOREIGN KEY ("userId", "invoiceId", "linkId", "connectionId") REFERENCES "gateway_links"("userId", "invoiceId", "id", "connectionId") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_userId_invoiceId_fkey" FOREIGN KEY ("userId", "invoiceId") REFERENCES "invoices"("userId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_userId_invoiceId_paymentId_fkey" FOREIGN KEY ("userId", "invoiceId", "paymentId") REFERENCES "gateway_payments"("userId", "invoiceId", "id") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gateway_webhook_events" ADD CONSTRAINT "gateway_webhook_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "razorpay_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_webhook_secrets" ADD CONSTRAINT "gateway_webhook_secrets_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "razorpay_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;


\ir ../constraints/razorpay.sql
COMMIT;
