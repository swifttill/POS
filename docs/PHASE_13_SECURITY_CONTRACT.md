# Phase 13 — Security, Concurrency & Production Integrity Contract

## Trust boundaries
- Authentication/session identity is authoritative; mutation payloads must not choose their actor.
- Every company-owned lookup is tenant scoped. Cross-company and cross-order child identifiers return NOT_FOUND semantics.
- Every privileged command checks a granular permission server-side. UI visibility is never authorization.
- Prices, totals, discounts, taxes, payment balance, refundability and reconciliation remain server authoritative.

## Mutation integrity
- Financial and table/order mutations execute transactionally; collision-prone workflows use SERIALIZABLE semantics or equivalent row locks/constraints.
- Optimistic `Order.version` rejects stale terminal writes.
- Payment/refund/shift-close operations use bounded idempotency keys and immutable ledger records.
- Serializable/deadlock conflicts may retry only with a small hard bound; business conflicts are never blindly retried.
- Order item identifiers are always constrained to their parent order to prevent IDOR.

## Data integrity
- Money is integer minor units and must stay within JavaScript safe-integer range at domain boundaries.
- One-active-order-per-table and one-active-primary-table invariants remain database enforced.
- Closed financial history is corrected with reversal/refund/adjustment records, never overwrite/delete.
- Receipt/Z/report historical documents use immutable snapshots.
- Reconciliation mismatches are surfaced; reports must not force differences to zero.

## Information security
- Secrets are environment supplied and never committed.
- Audit metadata redacts PIN/password/token/secret/auth/cookie-shaped fields.
- Public errors expose stable codes, not stack traces, SQL, paths or credentials.
- Local print service remains loopback-only and token authenticated.

## Production gate
Phase 13 is a source-level engineering gate in this sandbox. A release still requires dependency installation, real database migration rehearsal, production Next.js build, browser/device QA, and Windows USB hardware verification.
