CREATE TYPE "PrinterTransport" AS ENUM ('WINDOWS_USB_RAW','WINDOWS_SYSTEM');
CREATE TYPE "PrinterDeviceStatus" AS ENUM ('READY','OFFLINE','ERROR','UNKNOWN');
CREATE TABLE "PrinterDevice" (
 "id" TEXT PRIMARY KEY, "displayName" TEXT NOT NULL, "systemPrinterName" TEXT NOT NULL UNIQUE,
 "transport" "PrinterTransport" NOT NULL DEFAULT 'WINDOWS_USB_RAW', "paperWidthMm" INTEGER NOT NULL DEFAULT 80,
 "active" BOOLEAN NOT NULL DEFAULT TRUE, "cashDrawerEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
 "status" "PrinterDeviceStatus" NOT NULL DEFAULT 'UNKNOWN', "lastSeenAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "LocalPrintDispatch" (
 "id" TEXT PRIMARY KEY, "receiptPrintJobId" TEXT, "printerDeviceId" TEXT NOT NULL, "documentKind" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL UNIQUE, "attempts" INTEGER NOT NULL DEFAULT 0, "sent" BOOLEAN NOT NULL DEFAULT FALSE,
 "errorCode" TEXT, "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "LocalPrintDispatch_printerDeviceId_fkey" FOREIGN KEY ("printerDeviceId") REFERENCES "PrinterDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "PrinterDevice" ADD CONSTRAINT "PrinterDevice_paper_width_check" CHECK ("paperWidthMm" IN (58,80));
ALTER TABLE "LocalPrintDispatch" ADD CONSTRAINT "LocalPrintDispatch_attempts_check" CHECK ("attempts" >= 0 AND "attempts" <= 5);
CREATE INDEX "PrinterDevice_active_status_idx" ON "PrinterDevice"("active","status");
CREATE INDEX "LocalPrintDispatch_printer_requested_idx" ON "LocalPrintDispatch"("printerDeviceId","requestedAt");
CREATE INDEX "LocalPrintDispatch_sent_requested_idx" ON "LocalPrintDispatch"("sent","requestedAt");
