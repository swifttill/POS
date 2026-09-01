-- Phase 05: auditable discounts, deterministic allocation, manager approval references,
-- and persistent split-bill plans. Financial settlement of split parts arrives in Phase 06.

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DiscountScope" AS ENUM ('ORDER', 'ITEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DiscountSource" AS ENUM ('PRESET', 'CUSTOM', 'DEAL', 'COMP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "BillSplitMethod" AS ENUM ('EVEN', 'ITEMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "BillSplitStatus" AS ENUM ('OPEN', 'REVERTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DiscountRule" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "receiptName" TEXT,
  "type" "DiscountType" NOT NULL,
  "scope" "DiscountScope" NOT NULL,
  "value" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "stackable" BOOLEAN NOT NULL DEFAULT FALSE,
  "managerApprovalRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AppliedDiscount" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
  "orderItemId" TEXT REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "ruleId" TEXT REFERENCES "DiscountRule"("id") ON DELETE RESTRICT,
  "nameSnapshot" TEXT NOT NULL,
  "type" "DiscountType" NOT NULL,
  "scope" "DiscountScope" NOT NULL,
  "source" "DiscountSource" NOT NULL,
  "valueSnapshot" INTEGER NOT NULL,
  "amount" BIGINT NOT NULL CHECK ("amount" >= 0),
  "reason" TEXT,
  "appliedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DiscountAllocation" (
  "id" TEXT PRIMARY KEY,
  "appliedDiscountId" TEXT NOT NULL REFERENCES "AppliedDiscount"("id") ON DELETE RESTRICT,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "amount" BIGINT NOT NULL CHECK ("amount" >= 0),
  CONSTRAINT "DiscountAllocation_discount_item_unique" UNIQUE ("appliedDiscountId", "orderItemId")
);

CREATE TABLE IF NOT EXISTS "BillSplit" (
  "id" TEXT PRIMARY KEY,
  "parentOrderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
  "method" "BillSplitMethod" NOT NULL,
  "status" "BillSplitStatus" NOT NULL DEFAULT 'OPEN',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revertedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "BillSplitPart" (
  "id" TEXT PRIMARY KEY,
  "billSplitId" TEXT NOT NULL REFERENCES "BillSplit"("id") ON DELETE RESTRICT,
  "label" TEXT NOT NULL,
  "total" BIGINT NOT NULL CHECK ("total" >= 0),
  "paidAmount" BIGINT NOT NULL DEFAULT 0 CHECK ("paidAmount" >= 0 AND "paidAmount" <= "total"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BillSplitAllocation" (
  "id" TEXT PRIMARY KEY,
  "partId" TEXT NOT NULL REFERENCES "BillSplitPart"("id") ON DELETE RESTRICT,
  "orderItemId" TEXT REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "amount" BIGINT NOT NULL CHECK ("amount" >= 0)
);

CREATE INDEX IF NOT EXISTS "AppliedDiscount_order_active_idx" ON "AppliedDiscount"("orderId", "active");
CREATE INDEX IF NOT EXISTS "AppliedDiscount_item_active_idx" ON "AppliedDiscount"("orderItemId", "active");
CREATE INDEX IF NOT EXISTS "DiscountAllocation_item_idx" ON "DiscountAllocation"("orderItemId");
CREATE INDEX IF NOT EXISTS "BillSplit_parent_status_idx" ON "BillSplit"("parentOrderId", "status");
CREATE INDEX IF NOT EXISTS "BillSplitPart_split_idx" ON "BillSplitPart"("billSplitId");
CREATE INDEX IF NOT EXISTS "BillSplitAllocation_part_idx" ON "BillSplitAllocation"("partId");

-- One parent order may have only one currently active split plan.
CREATE UNIQUE INDEX IF NOT EXISTS "BillSplit_one_open_per_parent"
ON "BillSplit"("parentOrderId")
WHERE "status" = 'OPEN';
