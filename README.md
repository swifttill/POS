# SwiftTill — Phase 07 Certified

SwiftTill is a restaurant POS and billing system, not an ERP. This milestone was created directly from the certified Phase 06 archive and preserves all earlier Phase 00–06 work.

Implemented foundations now include financial primitives; users/roles/security/settings; catalogue/categories/variants/modifiers/deals; POS/cart/Dine-in/Takeaway/Delivery; table integrity; open-order management; discounts and split bill; Cash/Card/Online partial/split-tender payments; and Phase 07 void, refund, payment correction and immutable financial-audit contracts.

Phase 07 adds persistent `OrderVoid`, `OrderItemVoid`, `Refund` and `RefundAllocation` records. Refunds create new `REFUND` ledger transactions; incorrect finalized payment tenders are corrected through `REVERSAL` + replacement `PAYMENT`, never by rewriting the original transaction. Cross-order payment/item IDs are rejected. Paid orders cannot be operationally voided to erase history.

Operational Phase 07 UI entry points are `/pos/refunds` and `/pos/corrections`, linked from `/pos/orders`. They intentionally display real-data empty states rather than fake refunds/payments.

Direct USB thermal printing remains the locked V1 hardware direction and is implemented in its later dedicated phase. KOT/KDS, kitchen routing, inventory, suppliers and ERP scope remain excluded.

See `docs/PHASE_07_CERTIFICATION.md`, `docs/PHASE_07_API_CONTRACT.md`, `docs/PHASE_07_PARENT.txt` and `VERIFICATION_RESULTS.txt`.

## Phase 09 — Receipts & Billing
Adds immutable bill/receipt snapshots, final and partial-payment receipt semantics, duplicate lineage, refund receipts, deterministic 80mm/58mm thermal rendering, and post-commit print-job contracts. Native Windows USB transport remains Phase 11.

## Phase 10 — Dashboard & Reports
Adds authoritative dashboard/report calculation core, business-date filters, category/item/tender/cashier reporting, reconciliation, Excel-compatible SpreadsheetML export, printable report document adapter, thermal report layout, and responsive back-office Dashboard/Reports workspaces.

## Phase 11 — Windows Direct USB Print Service
Adds a loopback-only Windows print-agent contract, ESC/POS RAW encoding, Windows spooler bridge, installed-printer discovery, 80mm/58mm targets, cash-drawer pulse, retry/failure isolation, printer/dispatch persistence, and `/admin/printers`. Physical Windows USB hardware verification remains required before production deployment.

## Phase 12 — UI production refinement
Adds responsive POS/admin behavior, touch target standards, keyboard contracts, focus visibility, reduced-motion/high-contrast handling, and accessibility primitives without changing financial business rules.

## Phase 13 — Security, concurrency & production integrity
Adds reusable server-boundary guards for tenant/child ownership, actor anti-spoofing, permissions, safe money, optimistic concurrency, bounded serializable retries, reconciliation, immutable snapshots, audit redaction and safe public errors. See `docs/PHASE_13_SECURITY_CONTRACT.md` and `docs/PHASE_13_CERTIFICATION.md`.

## Final source release candidate
This tree is the Phase 13-derived final source release candidate. Start with `docs/PRODUCTION_CHECKLIST.md`, `docs/DEPLOYMENT.md`, and `docs/BACKUP_RESTORE.md`. Run `npm run verify` and `npm run verify:release` before promotion. Source certification does not replace target-environment build, PostgreSQL migration rehearsal, multi-terminal, browser/device, or physical USB printer/cash-drawer tests.

## rc.3 — Fully Custom Access Management
SwiftTill now supports unlimited custom roles, multiple roles per user, granular role permissions, and per-user `ALLOW / DENY / INHERIT` permission overrides. Effective access is server-authoritative and audited. See `docs/CUSTOM_ACCESS_MANAGEMENT.md`.
