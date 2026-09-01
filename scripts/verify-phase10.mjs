import fs from "node:fs";
const checks=[
 ["docs/PHASE_10_PARENT.txt","2ad3a7a75f43226623eda51defd48c96b3f2d15f2eba095fb471b2d54fcdd437"],
 ["prisma/schema.prisma","model ReportExportJob"],
 ["prisma/migrations/0011_dashboard_reports_exports/migration.sql","ReportExportJob_date_range_check"],
 ["packages/report-core/src/index.ts","categoryReport"],
 ["packages/report-core/src/index.ts","tenderReport"],
 ["packages/report-core/src/index.ts","spreadsheetXml"],
 ["packages/report-core/src/index.ts","printableReportHtml"],
 ["packages/report-core/src/index.ts","thermalReport"],
 ["apps/web/app/admin/dashboard/page.tsx","No demo sales are rendered"],
 ["apps/web/app/admin/reports/page.tsx","No fake report rows are shown"],
 ["docs/MASTER_PRODUCT_SPEC.md","physical USB transport remains Phase 11"]
];
for(const [f,t] of checks){const x=fs.readFileSync(f,"utf8");if(!x.includes(t))throw new Error(`Phase10 verification failed: ${f} missing ${t}`)}
const core=fs.readFileSync("packages/report-core/src/index.ts","utf8");
if(/waiterName/.test(core))throw new Error("Report core must not attribute cashier by waiterName");
if(/category.*order\.total|order\.total.*category/i.test(core))throw new Error("Category report whole-order total regression detected");
const runtime=core+fs.readFileSync("apps/web/app/admin/reports/page.tsx","utf8");
for(const term of ["KDS","KOT printer","inventory module","supplier module"])if(runtime.includes(term))throw new Error(`Forbidden runtime scope: ${term}`);
console.log("Phase 10 source contract verification: PASS");
