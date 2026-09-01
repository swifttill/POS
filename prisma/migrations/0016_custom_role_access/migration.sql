-- SwiftTill rc.3: fully custom roles + per-user permission overrides.
CREATE TYPE "PermissionOverrideEffect" AS ENUM ('ALLOW','DENY');

ALTER TABLE "Role" ADD COLUMN "description" TEXT;
ALTER TABLE "Role" ADD COLUMN "protected" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE "UserPermissionOverride" (
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "effect" "PermissionOverrideEffect" NOT NULL,
  "reason" TEXT,
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("userId","permissionId"),
  CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "UserPermissionOverride_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE
);
CREATE INDEX "UserPermissionOverride_permissionId_effect_idx" ON "UserPermissionOverride"("permissionId","effect");
CREATE INDEX "UserPermissionOverride_grantedById_idx" ON "UserPermissionOverride"("grantedById");
UPDATE "Role" SET "protected" = TRUE WHERE "systemRole" IS NOT NULL;
