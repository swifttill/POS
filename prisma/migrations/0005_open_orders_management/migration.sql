-- Phase 04: persisted hold/recall metadata and order-management integrity.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "heldAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "heldByUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "combinedIntoOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "combinedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_waiterId_operationalStatus_idx" ON "Order"("waiterId", "operationalStatus");
CREATE INDEX IF NOT EXISTS "Order_heldAt_idx" ON "Order"("heldAt");
CREATE INDEX IF NOT EXISTS "Order_combinedIntoOrderId_idx" ON "Order"("combinedIntoOrderId");

-- An order may link multiple merged tables, but at most one active link is primary.
CREATE UNIQUE INDEX IF NOT EXISTS "OrderTable_one_active_primary_per_order"
ON "OrderTable"("orderId")
WHERE "active" = TRUE AND "isPrimary" = TRUE;
