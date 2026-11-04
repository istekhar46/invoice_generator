-- One-time additive merchant setup upgrade after the payment receipt schema.
-- No existing invoice/payment rows or balances are changed.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

CREATE TYPE "RazorpayMode" AS ENUM ('TEST', 'LIVE');
CREATE TABLE "razorpay_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "RazorpayMode" NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "keySuffix" VARCHAR(4) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "razorpay_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "razorpay_connections_userId_mode_key" ON "razorpay_connections"("userId", "mode");
ALTER TABLE "razorpay_connections" ADD CONSTRAINT "razorpay_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
