-- Phase 06: payment ledger enrichment for split tender / split bill settlement.
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "splitPartId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "reference" TEXT;
CREATE INDEX IF NOT EXISTS "PaymentTransaction_splitPartId_idx" ON "PaymentTransaction"("splitPartId");
DO $$ BEGIN
  ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_splitPartId_fkey" FOREIGN KEY ("splitPartId") REFERENCES "BillSplitPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT IF EXISTS "PaymentTransaction_positive_amount";
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_positive_amount" CHECK ("amount" > 0);
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT IF EXISTS "PaymentTransaction_cash_fields_valid";
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_cash_fields_valid" CHECK (
  ("tender" = 'CASH' AND "tenderedAmount" IS NOT NULL AND "changeGiven" IS NOT NULL AND "tenderedAmount" >= "amount" AND "changeGiven" = "tenderedAmount" - "amount")
  OR ("tender" <> 'CASH' AND COALESCE("changeGiven",0) = 0 AND ("tenderedAmount" IS NULL OR "tenderedAmount" = "amount"))
);
