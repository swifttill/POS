import fs from "node:fs";
const checks=[["prisma/schema.prisma","model ReceiptDocument"],["prisma/schema.prisma","model ReceiptPrintJob"],["prisma/migrations/0010_receipts_print_snapshots/migration.sql","ReceiptPrintJob_paper_width_check"],["packages/receipt-core/src/index.ts","renderThermalText"],["packages/receipt-core/src/index.ts","duplicateFrom"],["docs/MASTER_PRODUCT_SPEC.md","native Windows USB transport remains Phase 11"],["apps/web/app/pos/receipts/page.tsx","No demo financial documents are shown"]];
for(const [f,t] of checks){const x=fs.readFileSync(f,"utf8");if(!x.includes(t))throw new Error(`Phase09 verification failed: ${f} missing ${t}`)}
const runtime=fs.readFileSync("packages/receipt-core/src/index.ts","utf8")+fs.readFileSync("apps/web/app/pos/receipts/page.tsx","utf8");
for(const term of ["KDS","KOT printer","inventory module","supplier module"]) if(runtime.includes(term)) throw new Error(`Forbidden runtime scope: ${term}`);
console.log("Phase 09 source contract verification: PASS");
