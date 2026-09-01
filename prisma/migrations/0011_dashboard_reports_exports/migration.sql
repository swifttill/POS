CREATE TYPE "ReportExportFormat" AS ENUM ('EXCEL_XML', 'PRINTABLE_PDF', 'THERMAL');
CREATE TYPE "ReportExportStatus" AS ENUM ('REQUESTED', 'GENERATED', 'FAILED');
CREATE TABLE "ReportExportJob" (
  "id" TEXT PRIMARY KEY,
  "reportType" TEXT NOT NULL,
  "format" "ReportExportFormat" NOT NULL,
  "status" "ReportExportStatus" NOT NULL DEFAULT 'REQUESTED',
  "fromBusinessDate" DATE NOT NULL,
  "toBusinessDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "filtersJson" JSONB,
  "requestedByUserId" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ReportExportJob_status_createdAt_idx" ON "ReportExportJob"("status", "createdAt");
CREATE INDEX "ReportExportJob_reportType_from_to_idx" ON "ReportExportJob"("reportType", "fromBusinessDate", "toBusinessDate");
ALTER TABLE "ReportExportJob" ADD CONSTRAINT "ReportExportJob_date_range_check" CHECK ("fromBusinessDate" <= "toBusinessDate");
