import fs from "node:fs";
const checks=[
 ["packages/access-core/src/index.ts","USER_DENY"],
 ["packages/access-core/src/index.ts","USER_ALLOW"],
 ["packages/access-core/src/index.ts","CANNOT_GRANT_PERMISSION"],
 ["packages/access-core/src/index.ts","LAST_ADMIN_REQUIRED"],
 ["packages/permissions/src/index.ts","users.override_permissions"],
 ["packages/permissions/src/index.ts","roles.assign_permissions"],
 ["prisma/schema.prisma","model UserPermissionOverride"],
 ["prisma/schema.prisma","PermissionOverrideEffect"],
 ["prisma/migrations/0016_custom_role_access/migration.sql","protected"],
 ["apps/web/app/admin/access/page.tsx","Users, Roles & Access Management"],
 ["apps/web/app/admin/access/page.tsx","Inherit"],
 ["docs/CUSTOM_ACCESS_MANAGEMENT.md","Explicit user `DENY`"],
 ["docs/CUSTOM_ACCESS_MANAGEMENT.md","final active administrator"]
];
for(const [f,n] of checks){const t=fs.readFileSync(f,"utf8");if(!t.includes(n))throw new Error(`${f} missing ${n}`)}
console.log(`Custom access source verification: PASS (${checks.length} checks)`);
