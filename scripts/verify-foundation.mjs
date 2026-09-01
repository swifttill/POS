import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const required = [
  "README.md",
  "docs/MASTER_PRODUCT_SPEC.md",
  "docs/PHASE_PLAN.md",
  "docs/PHASE_00_CERTIFICATION.md",
  "docs/PHASE_01_CERTIFICATION.md",
  "docs/PHASE_02_CERTIFICATION.md",
  "docs/PHASE_03_API_CONTRACT.md",
  "docs/PHASE_04_API_CONTRACT.md",
  "docs/PHASE_04_CERTIFICATION.md",
  "docs/PHASE_05_API_CONTRACT.md",
  "docs/PHASE_05_CERTIFICATION.md",
  "docs/PHASE_05_PARENT.txt",
  "docs/PHASE_06_API_CONTRACT.md",
  "docs/PHASE_06_CERTIFICATION.md",
  "docs/PHASE_06_PARENT.txt",
  "apps/web/app/page.tsx",
  "apps/web/app/pos/page.tsx",
  "apps/web/app/pos/orders/page.tsx",
  "apps/web/app/pos/tables/page.tsx",
  "apps/web/app/pos/discounts/page.tsx",
  "apps/web/app/pos/split-bill/page.tsx",
  "apps/web/app/pos/pay/page.tsx",
  "apps/web/app/globals.css",
  "packages/financial-core/src/index.ts",
  "packages/security-core/src/index.ts",
  "packages/settings-core/src/index.ts",
  "packages/permissions/src/index.ts",
  "packages/menu-core/src/index.ts",
  "packages/discount-core/src/index.ts",
  "packages/discount-core/src/discount-service.ts",
  "packages/discount-core/test/discount-core.test.ts",
  "packages/discount-core/test/discount-service.test.ts",
  "packages/pos-core/src/index.ts",
  "packages/pos-core/src/order-service.ts",
  "packages/pos-core/src/order-management.ts",
  "packages/pos-core/src/split-billing.ts",
  "packages/pos-core/test/pos-core.test.ts",
  "packages/pos-core/test/order-management.test.ts",
  "packages/pos-core/test/split-billing.test.ts",
  "packages/payment-core/src/index.ts",
  "packages/payment-core/src/payment-service.ts",
  "packages/payment-core/test/payment-core.test.ts",
  "packages/payment-core/test/payment-service.test.ts",
  "packages/correction-core/src/index.ts",
  "packages/correction-core/src/correction-service.ts",
  "packages/correction-core/test/correction-core.test.ts",
  "packages/correction-core/test/correction-service.test.ts",
  "prisma/migrations/0004_pos_tables_orders/migration.sql",
  "prisma/migrations/0005_open_orders_management/migration.sql",
  "prisma/migrations/0006_discounts_split_bill/migration.sql",
  "prisma/migrations/0007_payments_split_tender/migration.sql",
  "prisma/migrations/0008_void_refund_corrections/migration.sql",
  "docs/PHASE_07_API_CONTRACT.md",
  "docs/PHASE_07_PARENT.txt",
  "apps/web/app/pos/refunds/page.tsx",
  "apps/web/app/pos/corrections/page.tsx",
  "prisma/schema.prisma",
  ".env.example",
];

for (const file of required) await readFile(join(rootPath, file), "utf8");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", ".next"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(rootPath);
const forbiddenSecretPatterns = [
  /DATABASE_URL\s*=\s*["']?(?!postgresql:\/\/USER:PASSWORD@HOST)/i,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk_live_[A-Za-z0-9]+/,
  /AKIA[0-9A-Z]{16}/,
];
for (const file of files) {
  if (file.endsWith(".zip")) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(text) && !file.endsWith(".env.example") && relative(rootPath, file) !== ".env") throw new Error(`Possible secret detected in ${relative(rootPath, file)}`);
  }
}

const schema = await readFile(join(rootPath, "prisma/schema.prisma"), "utf8");
for (const requiredModel of ["model Order", "model OrderItem", "model PaymentTransaction", "model IdempotencyRecord", "model AuditEvent", "model Role", "model Permission", "model Session", "model ManagerApproval", "model Category", "model MenuItem", "model MenuVariant", "model ModifierGroup", "model ModifierOption", "model Deal", "model Customer", "model RestaurantTable", "model OrderTable", "model DiscountRule", "model AppliedDiscount", "model DiscountAllocation", "model BillSplit", "model BillSplitPart", "model BillSplitAllocation", "model OrderVoid", "model OrderItemVoid", "model Refund", "model RefundAllocation"]) {
  if (!schema.includes(requiredModel)) throw new Error(`Missing ${requiredModel}`);
}
for (const requiredOrderField of ["customerId", "primaryTableId", "pax", "deliveryAddressSnapshot", "tableNameSnapshot", "discounts", "billSplits"]) {
  if (!schema.includes(requiredOrderField)) throw new Error(`Missing Order context field ${requiredOrderField}`);
}

const migration3 = await readFile(join(rootPath, "prisma/migrations/0004_pos_tables_orders/migration.sql"), "utf8");
if (!migration3.includes('CREATE UNIQUE INDEX IF NOT EXISTS "OrderTable_one_active_order_per_table"')) throw new Error("Active-table uniqueness invariant missing");
if (!migration3.includes('WHERE "active" = TRUE')) throw new Error("Active-table uniqueness must be partial");
const migration4 = await readFile(join(rootPath, "prisma/migrations/0005_open_orders_management/migration.sql"), "utf8");
if (!migration4.includes('OrderTable_one_active_primary_per_order')) throw new Error("Active primary table invariant missing");
if (!migration4.includes('WHERE "active" = TRUE AND "isPrimary" = TRUE')) throw new Error("Active primary uniqueness must be partial");
const migration5 = await readFile(join(rootPath, "prisma/migrations/0006_discounts_split_bill/migration.sql"), "utf8");
if (!migration5.includes('BillSplit_one_open_per_parent')) throw new Error("One-open-split database invariant missing");
if (!migration5.includes('WHERE "status" = \'OPEN\'')) throw new Error("Open split uniqueness must be partial");
if (!migration5.includes('CHECK ("paidAmount" >= 0 AND "paidAmount" <= "total")')) throw new Error("Split paid amount constraint missing");

const posCore = await readFile(join(rootPath, "packages/pos-core/src/index.ts"), "utf8");
for (const invariant of ["TABLE_REQUIRED", "PAX_REQUIRED", "TABLE_OCCUPIED", "DELIVERY_ADDRESS_REQUIRED", "INVALID_QUANTITY"]) {
  if (!posCore.includes(invariant)) throw new Error(`POS invariant missing: ${invariant}`);
}
const phase4 = await readFile(join(rootPath, "packages/pos-core/src/order-management.ts"), "utf8");
for (const invariant of ["ORDER_VERSION_CONFLICT", "LAST_TABLE_CANNOT_BE_UNMERGED", "COMBINE_REQUIRES_UNPAID_ORDER", "ORDER_HELD", "TABLE_MOVED", "TABLE_MERGED"]) {
  if (!phase4.includes(invariant)) throw new Error(`Phase 04 invariant missing: ${invariant}`);
}
const discounts = await readFile(join(rootPath, "packages/discount-core/src/index.ts"), "utf8");
for (const invariant of ["DISCOUNT_STACKING_NOT_ALLOWED", "MANAGER_APPROVAL_REQUIRED", "APPROVAL_ALREADY_USED", "DISCOUNT_REASON_REQUIRED", "allocateOrderDiscount"]) {
  if (!discounts.includes(invariant)) throw new Error(`Phase 05 discount invariant missing: ${invariant}`);
}
const discountService = await readFile(join(rootPath, "packages/discount-core/src/discount-service.ts"), "utf8");
for (const invariant of ["ORDER_VERSION_CONFLICT", "DISCOUNT_REQUIRES_OPEN_ORDER", "DISCOUNT_WOULD_REDUCE_TOTAL_BELOW_PAID", "DISCOUNT_APPLIED", "consumeApproval"]) {
  if (!discountService.includes(invariant)) throw new Error(`Phase 05 discount service invariant missing: ${invariant}`);
}
const split = await readFile(join(rootPath, "packages/pos-core/src/split-billing.ts"), "utf8");
for (const invariant of ["SPLIT_REQUIRES_UNPAID_ORDER", "SPLIT_ITEM_ASSIGNED_TWICE", "UNASSIGNED_SPLIT_ITEMS", "SPLIT_ALREADY_FINANCIALLY_SETTLED", "BILL_SPLIT_CREATED"]) {
  if (!split.includes(invariant)) throw new Error(`Phase 05 split invariant missing: ${invariant}`);
}

const posPage = await readFile(join(rootPath, "apps/web/app/pos/page.tsx"), "utf8");
if (!posPage.includes("Phase 06 ledger-backed checkout")) throw new Error("Phase 06 payment entry boundary missing");
if (!posPage.includes("does not ship fake products")) throw new Error("No-fake-data boundary missing");
if (!posPage.includes('/pos/discounts') || !posPage.includes('/pos/split-bill') || !posPage.includes('/pos/pay')) throw new Error("POS phase entry points missing");
if (posPage.includes('currency: "PKR"')) throw new Error("POS UI contains hard-coded PKR currency formatter");
if (posPage.includes("Printer ready")) throw new Error("POS must not fake printer readiness before hardware phase");
const discountPage = await readFile(join(rootPath, "apps/web/app/pos/discounts/page.tsx"), "utf8");
if (!discountPage.includes("No persisted discount rules loaded")) throw new Error("Discount workspace must not ship fake rule data");
if (!discountPage.includes("does not convert the cashier session into a manager session")) throw new Error("Manager approval UX contract missing");
const splitPage = await readFile(join(rootPath, "apps/web/app/pos/split-bill/page.tsx"), "utf8");
if (!splitPage.includes("Split Bill ≠ Split Tender")) throw new Error("Split Bill/Tender distinction missing");
if (!splitPage.includes("No persisted order selected")) throw new Error("Split workspace must not fake an order");
const permissions = await readFile(join(rootPath, "packages/permissions/src/index.ts"), "utf8");
for (const permission of ["orders.split_bill", "discounts.apply_preset", "discounts.apply_custom", "discounts.remove", "discounts.approve"]) if (!permissions.includes(permission)) throw new Error(`Permission missing: ${permission}`);

const spec = await readFile(join(rootPath, "docs/MASTER_PRODUCT_SPEC.md"), "utf8");
if (!spec.includes("Direct USB Thermal Printer")) throw new Error("USB-only printer direction not preserved");
if (!spec.includes("not an ERP")) throw new Error("Product boundary not preserved");
if (!spec.includes("Phase 05 implementation lock")) throw new Error("Phase 05 continuity lock missing");
if (!spec.includes("Phase 06 implementation lock")) throw new Error("Phase 06 continuity lock missing");
if (!spec.includes("Phase 07 implementation lock")) throw new Error("Phase 07 continuity lock missing");
const paymentCore = await readFile(join(rootPath, "packages/payment-core/src/index.ts"), "utf8");
for (const invariant of ["PARTIALLY_PAID", "ORDER_ALREADY_PAID", "IDEMPOTENCY_KEY_REUSED", "applyCashTender", "validateNonCashTender"]) if (!paymentCore.includes(invariant)) throw new Error(`Phase 06 payment invariant missing: ${invariant}`);
const paymentService = await readFile(join(rootPath, "packages/payment-core/src/payment-service.ts"), "utf8");
for (const invariant of ["IDEMPOTENCY_KEY_REQUIRED", "PAYMENT_REQUIRES_OPEN_ORDER", "PAYMENT_RECORDED", "lockOrder", "createIdempotency"]) if (!paymentService.includes(invariant)) throw new Error(`Phase 06 service invariant missing: ${invariant}`);
const migration6 = await readFile(join(rootPath, "prisma/migrations/0007_payments_split_tender/migration.sql"), "utf8");
if (!migration6.includes("PaymentTransaction_positive_amount") || !migration6.includes("PaymentTransaction_cash_fields_valid")) throw new Error("Phase 06 payment DB constraints missing");
const payPage = await readFile(join(rootPath, "apps/web/app/pos/pay/page.tsx"), "utf8");
if (!payPage.includes("No persisted order selected") || !payPage.includes("does not create a fake payment")) throw new Error("Payment workspace fake-data boundary missing");
const correctionCore = await readFile(join(rootPath, "packages/correction-core/src/index.ts"), "utf8");
for (const invariant of ["REFUND_LIMIT_EXCEEDED", "REFUND_QUANTITY_EXCEEDED", "PAID_ORDER_REQUIRES_REFUND", "PAYMENT_ALREADY_REVERSED", "PARTIALLY_REFUNDED"]) if (!correctionCore.includes(invariant)) throw new Error(`Phase 07 correction invariant missing: ${invariant}`);
const correctionService = await readFile(join(rootPath, "packages/correction-core/src/correction-service.ts"), "utf8");
for (const invariant of ["REFUND_CREATED", "PAYMENT_REVERSED", "PAYMENT_CORRECTED", "ORDER_VOIDED", "ITEM_VOIDED", "ORDER_ITEM_NOT_FOUND", "PAYMENT_NOT_FOUND"]) if (!correctionService.includes(invariant)) throw new Error(`Phase 07 service invariant missing: ${invariant}`);
const migration7 = await readFile(join(rootPath, "prisma/migrations/0008_void_refund_corrections/migration.sql"), "utf8");
for (const invariant of ["Refund_amount_positive", "OrderItemVoid_quantity_positive", "PaymentTransaction_originalTransactionId_idx", "RefundAllocation"]) if (!migration7.includes(invariant)) throw new Error(`Phase 07 DB invariant missing: ${invariant}`);
const refundPage = await readFile(join(rootPath, "apps/web/app/pos/refunds/page.tsx"), "utf8");
if (!refundPage.includes("No completed order selected") || !refundPage.includes("does not claim a bank refund succeeded")) throw new Error("Refund workspace boundary missing");
const correctionPage = await readFile(join(rootPath, "apps/web/app/pos/corrections/page.tsx"), "utf8");
if (!correctionPage.includes("never overwrites its tender in place") || !correctionPage.includes("REVERSE → RE-TENDER")) throw new Error("Payment correction UX contract missing");
console.log(`Phase 07 source verification passed (${files.length} files checked).`);
