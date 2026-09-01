-- Phase 03: POS workstation, customer context and dine-in table assignments.
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");

CREATE TABLE IF NOT EXISTS "RestaurantTable" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 2,
  "section" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "outOfService" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantTable_capacity_check" CHECK ("capacity" > 0)
);
CREATE INDEX IF NOT EXISTS "RestaurantTable_active_displayOrder_idx" ON "RestaurantTable"("active", "displayOrder");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "primaryTableId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pax" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "waiterId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddressSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tableNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhoneSnapshot" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_pax_check" CHECK ("pax" IS NULL OR "pax" > 0);

CREATE TABLE IF NOT EXISTS "OrderTable" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "OrderTable_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT,
  CONSTRAINT "OrderTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "OrderTable_orderId_active_idx" ON "OrderTable"("orderId", "active");
CREATE INDEX IF NOT EXISTS "OrderTable_tableId_active_idx" ON "OrderTable"("tableId", "active");
-- PostgreSQL partial uniqueness is the DB-level invariant for one active assignment per physical table.
CREATE UNIQUE INDEX IF NOT EXISTS "OrderTable_one_active_order_per_table" ON "OrderTable"("tableId") WHERE "active" = TRUE;
