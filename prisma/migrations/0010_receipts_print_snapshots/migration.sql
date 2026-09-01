-- Phase 09: immutable customer-facing receipt snapshots and post-commit print queue.
CREATE TYPE "ReceiptKind" AS ENUM ('BILL','FINAL','PARTIAL_PAYMENT','DUPLICATE','REFUND');
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED','SENT','FAILED');
CREATE TABLE "ReceiptDocument" (
  "id" TEXT PRIMARY KEY,
  "receiptNumber" TEXT NOT NULL UNIQUE,
  "kind" "ReceiptKind" NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentTransactionId" TEXT,
  "refundId" TEXT,
  "originalReceiptId" TEXT,
  "currencyCode" TEXT NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "issuedByUserId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptDocument_originalReceiptId_fkey" FOREIGN KEY ("originalReceiptId") REFERENCES "ReceiptDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReceiptDocument_orderId_issuedAt_idx" ON "ReceiptDocument"("orderId","issuedAt");
CREATE INDEX "ReceiptDocument_paymentTransactionId_idx" ON "ReceiptDocument"("paymentTransactionId");
CREATE INDEX "ReceiptDocument_refundId_idx" ON "ReceiptDocument"("refundId");
CREATE INDEX "ReceiptDocument_originalReceiptId_idx" ON "ReceiptDocument"("originalReceiptId");
CREATE TABLE "ReceiptPrintJob" (
  "id" TEXT PRIMARY KEY,
  "receiptDocumentId" TEXT NOT NULL,
  "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
  "paperWidthMm" INTEGER NOT NULL DEFAULT 80,
  "copies" INTEGER NOT NULL DEFAULT 1,
  "errorCode" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  CONSTRAINT "ReceiptPrintJob_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "ReceiptDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReceiptPrintJob_paper_width_check" CHECK ("paperWidthMm" IN (58,80)),
  CONSTRAINT "ReceiptPrintJob_copies_check" CHECK ("copies" BETWEEN 1 AND 5)
);
CREATE INDEX "ReceiptPrintJob_status_queuedAt_idx" ON "ReceiptPrintJob"("status","queuedAt");
CREATE INDEX "ReceiptPrintJob_receiptDocumentId_idx" ON "ReceiptPrintJob"("receiptDocumentId");
