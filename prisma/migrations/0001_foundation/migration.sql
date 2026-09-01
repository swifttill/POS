-- SwiftTill executable PostgreSQL foundation. Later numbered migrations evolve this baseline.
CREATE TYPE "OrderType" AS ENUM ('DINE_IN','TAKEAWAY','DELIVERY');
CREATE TYPE "OperationalStatus" AS ENUM ('OPEN','CLOSED','VOIDED');
CREATE TYPE "FinancialStatus" AS ENUM ('UNPAID','PARTIALLY_PAID','PAID','PARTIALLY_REFUNDED','FULLY_REFUNDED');
CREATE TYPE "PaymentTransactionType" AS ENUM ('PAYMENT','REVERSAL','REFUND');
CREATE TYPE "Tender" AS ENUM ('CASH','CARD','ONLINE');

CREATE TABLE "Company" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'PKR',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
  "taxEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_taxRateBps_check" CHECK ("taxRateBps" >= 0 AND "taxRateBps" <= 10000)
);
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY,
  "orderNumber" BIGINT NOT NULL UNIQUE,
  "type" "OrderType" NOT NULL,
  "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'OPEN',
  "financialStatus" "FinancialStatus" NOT NULL DEFAULT 'UNPAID',
  "currencyCode" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "grossSubtotal" BIGINT NOT NULL DEFAULT 0,
  "discountTotal" BIGINT NOT NULL DEFAULT 0,
  "taxableSubtotal" BIGINT NOT NULL DEFAULT 0,
  "taxTotal" BIGINT NOT NULL DEFAULT 0,
  "total" BIGINT NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_money_nonnegative" CHECK ("grossSubtotal">=0 AND "discountTotal">=0 AND "taxableSubtotal">=0 AND "taxTotal">=0 AND "total">=0),
  CONSTRAINT "Order_total_consistency" CHECK ("taxableSubtotal" = "grossSubtotal" - "discountTotal" AND "total" = "taxableSubtotal" + "taxTotal")
);
CREATE INDEX "Order_businessDate_idx" ON "Order"("businessDate");
CREATE INDEX "Order_operationalStatus_idx" ON "Order"("operationalStatus");
CREATE INDEX "Order_financialStatus_idx" ON "Order"("financialStatus");
CREATE INDEX "Order_type_operationalStatus_idx" ON "Order"("type","operationalStatus");

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
  "menuItemId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "categoryNameSnapshot" TEXT,
  "variantNameSnapshot" TEXT,
  "unitPriceSnapshot" BIGINT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineGross" BIGINT NOT NULL,
  "lineDiscount" BIGINT NOT NULL DEFAULT 0,
  "lineTax" BIGINT NOT NULL DEFAULT 0,
  "lineTotal" BIGINT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity">0),
  CONSTRAINT "OrderItem_money_nonnegative" CHECK ("unitPriceSnapshot">=0 AND "lineGross">=0 AND "lineDiscount">=0 AND "lineTax">=0 AND "lineTotal">=0)
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");
CREATE TABLE "OrderItemModifier" (
  "id" TEXT PRIMARY KEY,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE RESTRICT,
  "modifierId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "priceDeltaSnapshot" BIGINT NOT NULL
);
CREATE INDEX "OrderItemModifier_orderItemId_idx" ON "OrderItemModifier"("orderItemId");

CREATE TABLE "PaymentTransaction" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
  "type" "PaymentTransactionType" NOT NULL,
  "tender" "Tender" NOT NULL,
  "amount" BIGINT NOT NULL,
  "tenderedAmount" BIGINT,
  "changeGiven" BIGINT,
  "originalTransactionId" TEXT,
  "performedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "reason" TEXT,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");
CREATE INDEX "PaymentTransaction_tender_idx" ON "PaymentTransaction"("tender");

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT PRIMARY KEY,"key" TEXT NOT NULL UNIQUE,"operation" TEXT NOT NULL,"actorUserId" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,"resultReference" TEXT,"status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
CREATE TABLE "AuditEvent" (
  "id" TEXT PRIMARY KEY,"action" TEXT NOT NULL,"entityType" TEXT NOT NULL,"entityId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,"approverUserId" TEXT,"reason" TEXT,
  "beforeSnapshot" JSONB,"afterSnapshot" JSONB,"metadata" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType","entityId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE SEQUENCE IF NOT EXISTS "OrderNumberSeq" START 1001;
