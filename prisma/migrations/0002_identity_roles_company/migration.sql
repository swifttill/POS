-- Phase 01 identity, authorization and company settings foundation.
CREATE TYPE "SystemRole" AS ENUM ('ADMIN','MANAGER','CASHIER','WAITER');
ALTER TABLE "Company" ADD COLUMN "legalName" TEXT, ADD COLUMN "address" TEXT, ADD COLUMN "phone" TEXT, ADD COLUMN "email" TEXT, ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'GST';
CREATE TABLE "Role" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL UNIQUE,"systemRole" "SystemRole","active" BOOLEAN NOT NULL DEFAULT TRUE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Permission" ("id" TEXT PRIMARY KEY,"key" TEXT NOT NULL UNIQUE);
CREATE TABLE "RolePermission" ("roleId" TEXT NOT NULL,"permissionId" TEXT NOT NULL,PRIMARY KEY ("roleId","permissionId"),FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE,FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE);
CREATE TABLE "UserRole" ("userId" TEXT NOT NULL,"roleId" TEXT NOT NULL,PRIMARY KEY ("userId","roleId"),FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT);
CREATE TABLE "Session" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"terminalId" TEXT,"expiresAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId","expiresAt");
CREATE TABLE "ManagerApproval" ("id" TEXT PRIMARY KEY,"action" TEXT NOT NULL,"entityType" TEXT NOT NULL,"entityId" TEXT NOT NULL,"requestedById" TEXT NOT NULL,"approvedById" TEXT NOT NULL,"contextHash" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ManagerApproval_entityType_entityId_idx" ON "ManagerApproval"("entityType","entityId");
CREATE INDEX "ManagerApproval_expiresAt_idx" ON "ManagerApproval"("expiresAt");
CREATE TABLE "SecurityThrottle" ("userId" TEXT PRIMARY KEY,"failedAttempts" INTEGER NOT NULL DEFAULT 0,"lockedUntil" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL);
