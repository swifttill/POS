# SwiftTill Phase 04 Certification

Status: CERTIFIED FOUNDATION MILESTONE

Scope: Open Orders, persisted Hold/Recall, Recent Orders domain, Move Table, Merge/Unmerge Tables, staff transfer contract, order-type changes, combine-order guardrails, order version concurrency and operational workspaces.

## Continuity

Phase 04 was built directly on the certified Phase 03 artifact. Parent SHA-256 is recorded in `PHASE_04_PARENT.txt`. Phase 00 financial primitives, Phase 01 identity/settings, Phase 02 catalogue/pricing and Phase 03 POS/table invariants remain regression tested.

## Verification performed

- Phase 00 financial tests.
- Phase 01 security/settings tests.
- Phase 02 menu/pricing tests.
- Phase 03 POS/cart/table tests.
- Phase 04 order-management tests covering persisted hold, stale version rejection, transactional table movement, merge/unmerge rules, order-type validation, combine restrictions, filters and recent-order ordering.
- Source/security/integrity verification.
- PostgreSQL migration inspection for active-primary table uniqueness.
- ZIP archive integrity test after packaging.

## Certified invariants

- Hold/Recall is server-persisted, not local-only.
- Stale order versions are rejected.
- Move/Merge checks destination availability transactionally.
- One physical table still cannot belong to two active parent orders.
- A merged order has at most one active primary table link.
- Last Dine-in table cannot be unmerged.
- Combine requires distinct OPEN + UNPAID orders.
- Order-management mutations are audit-ready.
- UI does not invent persisted orders/tables.
- Payment and direct USB printing remain later phases and are not falsely simulated.
- KOT/KDS/inventory/ERP remain excluded.

## Environment limitation

The package registry is not required for the dependency-free domain verification above. A full Next.js production build is only certifiable after dependencies are available/installed; this certification does not claim a production web build that was not executed.
