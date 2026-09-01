# SwiftTill Master Product Specification

Status: LOCKED through Module 16. This file is the continuity contract for implementation phases.

## Product boundary

SwiftTill is a restaurant POS and billing system, not an ERP. V1 supports Dine-in, Takeaway and Delivery; one active open dine-in order per physical table; open-order recall/edit; customer billing; Cash/Card/Online and split tender; split bill; discounts with controlled approval; receipts/reprints; menu/categories/modifiers/deals; tables; shifts; reports; users/roles/permissions; company/tax/currency/printer settings; void/refund/corrections; financial audit.

Out of V1: kitchen/KDS workflows, inventory, suppliers/purchasing, CRM, expenses/accounting ERP, multi-branch and online ordering.

## Non-negotiable financial rules

1. Server is authoritative for item, variant, modifier, deal, discount, tax and payment calculations.
2. Finalized financial records are never silently overwritten. Corrections use explicit reversal/refund/adjustment records.
3. Canonical totals: gross subtotal -> validated discount -> taxable subtotal -> tax -> total.
4. Cash tender above balance is change, not revenue. Persist applied amount, tendered amount and change.
5. Split tender is one bill with multiple payment ledger entries. Split bill is multiple payable parts and is modeled separately.
6. Payment/refund/shift-close operations are transaction-safe and idempotent.
7. Historical receipts/reports use transaction-time snapshots, not current menu/settings.
8. One physical table may not have two independent active dine-in parent orders.
9. Actual actor identity comes from authenticated server session, never a client-entered cashier/waiter string.
10. Printer failure never rolls back a successful financial transaction.

## UX direction

POS is a full-screen restaurant workstation: dark navy/charcoal command bar, white operational surfaces, SwiftTill blue primary actions, green payment/success, restrained amber warnings and red destructive actions. Desktop uses category/context rail + product grid + fixed current-order panel. Touch, mouse and keyboard are first-class. Primary touch targets are generally 48–56px, with practical minimum near 44px.

Admin uses the same visual family with compact persistent navigation, full-width working canvas, sticky toolbars/filters and table/workflow-first layouts.

## Locked modules

01 POS Order Entry & Cart
02 Tables & Dine-in Flow
03 Open Orders / Order Management
04 Payments & Split Tender/Billing
05 Receipts / Billing / Duplicate / Printing
06 Discounts / Promotions / Manager Approval
07 Void / Refund / Corrections / Audit Trail
08 Menu / Categories / Modifiers / Deals
09 Reports / Excel / PDF / Thermal
10 Shifts / Cash Drawer / X-Z
11 Users / Roles / Permissions / Authentication
12 Company / Tax / Currency / Settings
13 Admin Dashboard / Operational Overview
14 Direct USB Thermal Printer & Cash Drawer
15 API / Database / Financial Integrity / Reliability
16 QA / Responsive / Touch / Keyboard / Production Readiness

## Module 14 V1 constraint

Printing is USB-first on native Windows. Normal cashier flow must print directly through a small SwiftTill Print Service/Agent with no browser print dialog. Primary target is an installed Windows USB thermal printer, usually ESC/POS-compatible; 80mm is primary and 58mm remains optional. LAN/Wi-Fi/cloud routing is not part of V1. Cash drawer may be kicked through the configured receipt printer. Direct print is post-commit and never part of the payment database transaction.

## Technical foundation

- Web: Next.js + React + TypeScript.
- Database: PostgreSQL.
- Validation: runtime validation at API boundaries.
- Money: integer minor units in application/business logic.
- Ledger: immutable payment/reversal/refund transaction records.
- Concurrency: transactions, row/assignment locking, unique constraints, idempotency and version checks where needed.
- Security: authenticated server sessions, granular permissions, action-bound manager approvals, rate limiting for PIN/security endpoints, no secrets in source.
- Reporting: server-side authoritative aggregation from snapshots/ledger.
- Printing: separate Windows USB Print Service introduced in its dedicated phase.

## Phase 02 implementation lock — Menu Catalogue
Phase 02 implements the catalogue foundation for categories, menu items, variants/sizes, reusable modifier groups/options, item-to-modifier assignments, availability, favorites and deal definitions. Pricing is server-authoritative: clients submit identifiers and selections, never authoritative item/modifier/deal prices. Historical order snapshots remain immutable. Percentage promotions are represented as real discount amounts, never zero-price fake cart lines. Inventory quantities, suppliers, ingredients and KOT/kitchen routing remain out of scope. Product image fields store durable object URLs/keys; production storage is abstracted for later Cloudflare R2-compatible integration rather than database base64 blobs.

## Phase 03 implementation lock — POS Workstation, Cart & Tables
Phase 03 adds the full-screen POS workstation shell and the domain/data foundation for Dine-in, Takeaway and Delivery order entry. Dine-in requires a physical table and pax; non-dine-in orders cannot silently retain table context. RestaurantTable and active OrderTable assignments model table occupancy, with a PostgreSQL partial unique index preventing one physical table from being assigned to two active parent orders. Cart gross uses integer minor units and includes persisted modifier snapshots. Quantity, notes and context are bounded/validated. The POS intentionally contains no fake production catalogue or fake table availability; persisted Phase 02 catalogue/table data will be connected through the authoritative API/service layer. Payment remains disabled until its ledger phase rather than simulating checkout.

## Phase 04 implementation lock — Open Orders & Order Management

Phase 04 is preserved as the operational order-control layer. OPEN orders are server-persisted and recallable; explicit Hold stores `heldAt/heldByUserId`. Open Orders supports the contract for search/filter by order/table/customer/phone, type, partial-payment state and held state plus bounded recent orders.

Order mutations are explicit transactional commands with optimistic `version` checks: Hold/Recall, Move Table, Merge/Unmerge Tables, Transfer Staff, Change Order Type and Combine Orders. Move keeps the same financial order; Merge attaches multiple physical tables to one parent order; occupied independent orders are never silently merged. Unmerge cannot leave a Dine-in order with zero tables. Changing away from Dine-in releases table assignments atomically; changing to Dine-in requires an available table and valid pax. Combining is V1-restricted to two distinct OPEN + UNPAID orders.

The PostgreSQL one-active-order-per-table invariant from Phase 03 is preserved, and Phase 04 adds a partial unique index allowing at most one active primary table per order. All commands are audit-ready and stale client versions fail instead of overwriting newer terminal activity. No fake open-order rows or fake table occupancy are shipped in the UI.


## Phase 05 implementation lock

Phase 05 preserves all earlier invariants and adds server-authoritative discounts and persistent split-bill planning. Manual/custom discounts require reason snapshots, non-stackable rules cannot silently combine, manager approval is action/order/requestor/context bound, and order-level discount allocation must sum exactly in minor units. V1 split creation requires an OPEN + UNPAID order, supports even split and whole-line item split, rejects stale order versions, persists a single active split plan per parent order, and cannot be reverted after any split part is financially settled. Split Bill is explicitly distinct from Split Tender. Payments remain Phase 06.

## Phase 06 implementation lock
Cash/Card/Online payments are immutable ledger entries. Partial payment and split tender are supported. Cash over-tender becomes change and never revenue; Card/Online cannot overpay. Payment writes are transaction-bound and idempotent, and the server reloads authoritative order/balance before settlement. Split Tender is not Split Bill. Printing remains outside payment commit. Corrections/refunds remain Phase 07.


## Phase 07 implementation lock
Void, refund and payment-correction workflows preserve financial history rather than mutating it. An unpaid OPEN order may be voided with a required reason; a paid or partially paid order must use payment correction/refund instead. Saved item voids are immutable quantity/value events and must cause authoritative order-total recalculation.

Refunds are new immutable ledger transactions linked to a persistent Refund record. Remaining refundable value is calculated from payment, reversal and refund history under a database transaction. Item/quantity refunds use historical order-line gross, discount, tax and total snapshots; the same sold quantity cannot be refunded twice. Refund writes are idempotent and over-refund attempts fail. Card/Online remain externally processed tenders in V1, so the product must not falsely claim a bank-side refund succeeded.

Payment-mode correction never updates the original PaymentTransaction tender. SwiftTill records a reversal of the original transaction and a replacement payment with the corrected tender, preserving reason, performedBy and approvedBy. Cross-order payment/item IDs are rejected. Whole-order void releases active table assignments. Corrections, voids and refunds emit immutable audit events.

## Phase 08 implementation lock — Shifts & Cash Drawer
- Shift lifecycle OPEN → CLOSING → CLOSED; default one active primary shift per trusted POS terminal.
- Opening float is physical drawer cash, never revenue.
- Expected drawer derives from immutable cash payment/refund/reversal ledger plus explicit Cash In/Out/Safe Drop/Adjustment movements. Card/Online excluded.
- X report is live/read-only and can be generated repeatedly without closing/resetting.
- Blind count can hide expected drawer from cashier until count submission; backend payloads must enforce this, not CSS.
- Close is atomic and idempotent: lock shift, validate pending payments/open orders, calculate authoritative expected cash, validate variance approval, persist immutable Z snapshot, mark CLOSED, audit.
- Closed shift/Z cannot be recalculated or edited because of later refunds; later corrections occur in current shift context.
- USB Z printing is a post-commit hardware action. Printer failure never reopens a shift.
- Cash drawer hardware command remains Phase 11 USB service; Phase 08 owns accounting and authorization semantics only.

## Phase 09 lock — Receipt truth
Customer-facing bills/receipts are immutable snapshots of the historical order/payment/refund state. Reprints and duplicates must use stored snapshots rather than current menu, tax or company configuration. Cash tendered/change is never confused with applied payment. Printing is post-commit: hardware failure must never roll back a valid payment or refund. Phase 09 owns document generation and 58/80mm layouts; native Windows USB transport remains Phase 11.

## Phase 10 lock — Dashboard / Reports / Exports
Dashboard and reports use authoritative business-date data in company timezone. Category/item totals are line-snapshot based; tender totals are ledger based; cashier attribution is authenticated-ID based. Reconciliation differences are visible. Excel-compatible SpreadsheetML, printable report documents and thermal layouts are source-certified; physical USB transport remains Phase 11.

## Phase 11 implementation lock — Direct Windows USB printing
Normal V1 print path is Windows POS browser/app → loopback-only SwiftTill Print Service → installed Windows USB thermal printer → ESC/POS RAW bytes. 80mm is primary; 58mm is optional. Cash drawer is pulsed through the receipt printer. Hardware failure never rolls back financial state. LAN/Wi-Fi/cloud printer routing remains out of scope.

## Phase 12 implementation lock — responsive, touch, keyboard, accessibility
- POS remains a full-screen cashier workstation; admin remains a dense back-office workspace in the same visual family.
- Practical touch minimum is 44px; primary/coarse-pointer controls target 48px or larger.
- Visible keyboard focus is mandatory; essential actions are never hover-only.
- POS keyboard contract includes F2 New Order, F3 Open Orders, F4 Tables, F9 Pay, Ctrl/Cmd+K Search and Escape dismissal where applicable.
- Responsive behavior explicitly covers desktop, large tablet, tablet and phone without hiding essential financial context.
- Reduced-motion and increased-contrast user preferences are honored.
- Printer status must be truthful; UI never labels a printer ready without a real local-service result.
- Phase 12 is UI/accessibility refinement only and does not weaken server-authoritative financial, table, permission or audit invariants.
