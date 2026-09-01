import fs from "node:fs";
const checks=[
 ["docs/PHASE_11_PARENT.txt","3ee677d309cbfd6aa0ee38ca2d9534b68376a2ca6b44665d619ebd0aef921ab1"],
 ["packages/print-core/src/index.ts","LOCALHOST_ONLY"],
 ["packages/print-core/src/index.ts","DRAWER_KICK"],
 ["services/windows-print-service/src/windows-raw-printer.ps1","WritePrinter"],
 ["services/windows-print-service/src/discover-printers.ps1","Get-Printer"],
 ["services/windows-print-service/src/service.ts","127.0.0.1"],
 ["prisma/schema.prisma","model PrinterDevice"],
 ["prisma/schema.prisma","model LocalPrintDispatch"],
 ["prisma/migrations/0012_windows_usb_print_service/migration.sql","PrinterDevice_paper_width_check"],
 ["apps/web/app/admin/printers/page.tsx","No local printer connected"],
 ["docs/PHASE_11_API_CONTRACT.md","Printer failure MUST NOT reverse payment"],
 ["docs/MASTER_PRODUCT_SPEC.md","LAN/Wi-Fi/cloud printer routing remains out of scope"]
];
for(const [f,t] of checks){const x=fs.readFileSync(f,"utf8");if(!x.includes(t))throw new Error(`Phase11 verification failed: ${f} missing ${t}`)}
const service=fs.readFileSync("services/windows-print-service/src/service.ts","utf8");
if(/0\.0\.0\.0/.test(service))throw new Error("Print service must not bind to LAN");
const ui=fs.readFileSync("apps/web/app/admin/printers/page.tsx","utf8");
for(const term of ["KDS","KOT printer","inventory module","supplier module"])if(ui.includes(term))throw new Error(`Forbidden runtime scope: ${term}`);
console.log("Phase 11 source contract verification: PASS");
