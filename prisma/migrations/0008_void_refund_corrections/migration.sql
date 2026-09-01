-- Phase 07: immutable void/refund/correction records.
CREATE TABLE IF NOT EXISTS "OrderVoid" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT,
  "reason" TEXT NOT NULL,
  "performedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrderItemVoid" (
  "id" TEXT PRIMARY KEY,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "quantity" INTEGER NOT NULL,
  "amount" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "performedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemVoid_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "OrderItemVoid_amount_nonnegative" CHECK ("amount" >= 0)
);
CREATE INDEX IF NOT EXISTS "OrderItemVoid_orderItemId_idx" ON "OrderItemVoid"("orderItemId");

CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
  "amount" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "performedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX IF NOT EXISTS "Refund_orderId_createdAt_idx" ON "Refund"("orderId","createdAt");

CREATE TABLE IF NOT EXISTS "RefundAllocation" (
  "id" TEXT PRIMARY KEY,
  "refundId" TEXT NOT NULL REFERENCES "Refund"("id") ON DELETE RESTRICT,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "quantity" INTEGER NOT NULL,
  "grossAmount" BIGINT NOT NULL,
  "discountAmount" BIGINT NOT NULL,
  "taxAmount" BIGINT NOT NULL,
  "totalAmount" BIGINT NOT NULL,
  CONSTRAINT "RefundAllocation_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "RefundAllocation_amounts_nonnegative" CHECK ("grossAmount" >= 0 AND "discountAmount" >= 0 AND "taxAmount" >= 0 AND "totalAmount" >= 0)
);
CREATE INDEX IF NOT EXISTS "RefundAllocation_refundId_idx" ON "RefundAllocation"("refundId");
CREATE INDEX IF NOT EXISTS "RefundAllocation_orderItemId_idx" ON "RefundAllocation"("orderItemId");

ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "refundId" TEXT;
DO $$ BEGIN
  ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "PaymentTransaction_originalTransactionId_idx" ON "PaymentTransaction"("originalTransactionId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_refundId_idx" ON "PaymentTransaction"("refundId");

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
