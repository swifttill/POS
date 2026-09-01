# SwiftTill Phase 06 Certification

Phase 06 was built directly on the certified Phase 05 archive.

Parent SHA-256: `0a2218f6d9f0ec7eb9df0cec0c71d6fe282ce6ac0822540ae6f135422454726b`

## Certified scope
- Cash, Card and Online tender domain.
- Partial payment and balance derivation.
- Split tender as independent immutable PAYMENT rows.
- Cash tendered/applied/change separation.
- Non-cash overpayment rejection.
- Idempotency fingerprint and duplicate-request recovery contract.
- Transaction-bound payment service contract with authoritative order reload/lock.
- Payment ledger enrichment for split-part linkage and manual external reference.
- Payment workspace with no fake order or fake settlement.
- Existing Phase 00–05 regression suites preserved.

## Boundary
Payment correction/reversal/refund is Phase 07 and is not falsely implemented here. Shifts are Phase 08. USB direct printing remains a later hardware phase and is outside payment commit.

## Certification rule
Certified means the source/domain verification available in this environment passed. It does not claim physical hardware validation or an unexecuted production dependency build.

## Verification result
53/53 automated tests passed across Phases 00–06. Source/security verification passed for 85 files. `payment-core` passed a strict TypeScript no-emit source check. The Next.js production build was attempted but could not execute because `next` is not installed in this isolated environment; this is recorded as a limitation, not a pass.
