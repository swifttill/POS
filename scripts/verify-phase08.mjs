import fs from "node:fs";
const checks=[
 ["prisma/schema.prisma","model Shift"],["prisma/schema.prisma","model CashMovement"],["prisma/schema.prisma","model ZReportSnapshot"],
 ["prisma/migrations/0009_shifts_cash_drawer/migration.sql","one_open_shift_per_terminal"],
 ["packages/shift-core/src/index.ts","expectedCash"],["packages/shift-core/src/index.ts","closeShiftAtomic"],
 ["docs/MASTER_PRODUCT_SPEC.md","USB Z printing is a post-commit hardware action"]
];
for(const [f,t] of checks){const x=fs.readFileSync(f,"utf8");if(!x.includes(t)) throw new Error(`Phase08 verification failed: ${f} missing ${t}`)}
const forbidden=["KDS","KOT printer","inventory module","supplier module"];
const runtime=["packages/shift-core/src/index.ts","apps/web/app/admin/shifts/page.tsx"].map(f=>fs.readFileSync(f,"utf8")).join("\n");
for(const term of forbidden) if(runtime.includes(term)) throw new Error(`Forbidden runtime scope: ${term}`);
console.log("Phase 08 source contract verification: PASS");
