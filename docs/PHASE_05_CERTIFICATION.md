# SwiftTill Phase 05 Certification

Status: CERTIFIED FOUNDATION MILESTONE

Scope: Discounts, manager approval guardrails, deterministic discount allocation, and persistent Split Bill planning.

## Continuity

Phase 05 was built directly on the certified Phase 04 artifact. The exact parent artifact and SHA-256 are recorded in `PHASE_05_PARENT.txt`. Phase 00–04 domain tests remain regression gates.

## Verification performed

- Phase 00 financial tests.
- Phase 01 security/settings tests.
- Phase 02 menu/pricing tests.
- Phase 03 POS/cart/table tests.
- Phase 04 order-management tests.
- Phase 05 discount tests: percent/fixed authority, stacking, manager-approval binding, exact minor-unit allocation, reason requirements, transactional application/version checks, approval consumption and paid-total guardrail.
- Phase 05 split-bill tests: deterministic even split, whole-item allocation, unpaid guardrail, revert protection after settlement, transactional persist/version/audit contract.
- TypeScript checks for financial, discount and POS domain packages where dependency-free execution is available.
- Source/security/integrity verification.
- Parent Phase 04 SHA continuity verification.
- ZIP integrity verification after packaging.

## Certified invariants

- Client never dictates the authoritative discount amount.
- Percentage discounts are basis-point calculations, not fake zero-price cart lines.
- Fixed discounts cannot make eligible value negative.
- Custom/comp adjustments preserve an auditable reason.
- Non-stackable discounts cannot silently combine.
- Manager approval is action/order/requestor/context bound and consumed atomically with the discount transaction by contract.
- Order-level discount allocations sum exactly to the applied discount in integer minor units.
- Split Bill is distinct from Split Tender.
- V1 split creation requires OPEN + UNPAID and a positive total.
- Even split preserves every minor unit deterministically.
- Item split assigns whole persisted order lines exactly once; fractional line splitting is intentionally excluded in V1.
- A split plan cannot be reverted after financial settlement starts.
- At most one OPEN split plan exists per parent order at database level.
- Split persistence is order-version checked, transaction-bound and audit-ready.
- Phase 06 payment settlement has not been faked or pre-certified.
- Direct USB printer direction remains preserved; KOT/KDS/inventory/ERP remain excluded.

## Environment limitation

A full Next.js production build is certifiable only when npm dependencies are available and installed. Phase 05 certification covers the dependency-free domain/test/source checks actually executed and does not claim a web production build that was not run.
