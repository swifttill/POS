CREATE TABLE "SavedReportDefinition" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  "definition" JSONB NOT NULL,
  "favorite" BOOLEAN NOT NULL DEFAULT FALSE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "SavedReportDefinition_owner_active_idx" ON "SavedReportDefinition"("ownerUserId","active");
CREATE INDEX "SavedReportDefinition_visibility_active_idx" ON "SavedReportDefinition"("visibility","active");
CREATE TABLE "ReportRunAudit" (
  "id" TEXT PRIMARY KEY,
  "reportType" TEXT NOT NULL,
  "savedReportId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "fromDate" DATE NOT NULL,
  "toDate" DATE NOT NULL,
  "filters" JSONB,
  "rowCount" INTEGER NOT NULL,
  "exportFormat" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportRunAudit_range_check" CHECK ("fromDate" <= "toDate"),
  CONSTRAINT "ReportRunAudit_row_count_check" CHECK ("rowCount" >= 0)
);
CREATE INDEX "ReportRunAudit_actor_created_idx" ON "ReportRunAudit"("actorUserId","createdAt");
CREATE INDEX "ReportRunAudit_type_created_idx" ON "ReportRunAudit"("reportType","createdAt");
