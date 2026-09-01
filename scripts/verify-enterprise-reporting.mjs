import fs from "node:fs";
const checks=[
 ["apps/web/app/login/page.tsx","SECURE SIGN IN"],
 ["apps/web/app/admin/access/page.tsx","Users, Roles & Access Management"],
 ["apps/web/app/admin/reports/page.tsx","Item-wise Sales (PMIX)"],
 ["apps/web/app/admin/reports/custom/page.tsx","Custom Report Builder"],
 ["packages/reporting-advanced-core/src/index.ts","REPORT_PRESETS"],
 ["packages/reporting-advanced-core/src/index.ts","runCustomReport"],
 ["packages/permissions/src/index.ts","reports.custom"],
 ["packages/permissions/src/index.ts","reports.item"],
 ["prisma/schema.prisma","model SavedReportDefinition"],
 ["prisma/schema.prisma","model ReportRunAudit"],
 ["docs/ENTERPRISE_REPORTING_RESEARCH.md","Square"],
 ["docs/ENTERPRISE_REPORTING_RESEARCH.md","Toast"]
];
for(const [file,needle] of checks){const text=fs.readFileSync(file,"utf8");if(!text.includes(needle))throw new Error(`${file} missing ${needle}`)}
console.log(`Enterprise access/reporting source verification: PASS (${checks.length} checks)`);
