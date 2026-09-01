# SwiftTill implementation phases

Each phase must be created, checked, verified and preserved before the next phase begins.

- Phase 00 — Foundation, architecture, financial primitives, design system, database baseline, verification.
- Phase 01 — Authentication, users, roles, permissions, company/regional settings.
- Phase 02 — Menu, categories, items, images, variants, modifiers and deals configuration.
- Phase 03 — POS workstation, cart, Dine-in/Takeaway/Delivery, tables.
- Phase 04 — Open orders, hold/recall, move/merge tables, transfers and order-type changes.
- Phase 05 — Discounts, manager approval and split bill.
- Phase 06 — Cash/Card/Online, split tender and partial payment.
- Phase 07 — Void, refund, payment correction and immutable audit workflows.
- Phase 08 — Shifts, drawer accounting, X and immutable Z close.
- Phase 09 — Receipts, 80mm/58mm thermal templates, duplicate/refund documents.
- Phase 10 — Admin dashboard and reports/Excel/PDF/thermal reporting.
- Phase 11 — Windows direct USB Print Service and cash-drawer integration.
- Phase 12 — Responsive/touch/keyboard/accessibility/UI refinement.
- Phase 13 — Security, race-condition, reconciliation and production QA.
- Final — clean production source package, migration/backup docs and final release artifact.

A phase is not considered complete merely because a screen exists. Its relevant API/data behavior, error states and verification must exist too.


## Phase 05 implementation — CERTIFIED
- Order/item discount domain and historical snapshots
- Preset/custom/comp authority and manager approval guardrails
- Deterministic discount allocation by order item
- Persistent split-bill plan: even / whole-item V1
- Revert protection after financial settlement
- Dedicated discount and split-bill POS workspaces

## Phase 06 implementation — CERTIFIED
- Cash/Card/Online immutable payment ledger
- Partial payment and split tender
- Cash tendered/applied/change separation
- Payment idempotency and authoritative balance reload

## Phase 07 implementation — CERTIFIED
- Unpaid order/item void records with required reasons
- Immutable refunds and historical item refund allocations
- Partial/full refund financial-state derivation and over-refund protection
- Payment correction by reversal + replacement tender, never in-place mutation
- Cross-order ownership guards for payment/item correction targets
- Transactional audit actor/approver/reason contracts

## Phase 08 — CERTIFIED SCOPE
Shifts, cash drawer accounting, opening/closing, X report semantics, immutable Z close snapshot and variance controls. Physical USB drawer/print commands remain Phase 11.
