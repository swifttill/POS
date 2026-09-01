-- rc.5 runtime hardening. Sequence-based identifiers avoid MAX()+1 races.
CREATE SEQUENCE IF NOT EXISTS "ShiftNumberSeq" START 1;
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_name_unique" ON "RestaurantTable"("name");
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_consistency";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_consistency" CHECK ("taxableSubtotal" = "grossSubtotal" - "discountTotal" AND "total" = "taxableSubtotal" + "taxTotal");
CREATE SEQUENCE IF NOT EXISTS "ReceiptNumberSeq" START 1;
