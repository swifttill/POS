# Phase 00 Certification

Phase: Foundation
Status: Source-verified baseline

## Completed

- Clean monorepo/workspace layout.
- Next.js/React/TypeScript web shell source.
- Shared visual tokens and responsive shell.
- Master locked product specification and phase plan.
- Financial-core minor-unit calculation primitives.
- Canonical gross -> discount -> taxable -> tax -> total rule.
- Cash applied/tendered/change semantics.
- Non-cash overpayment guard.
- Shared order/tender/status types.
- Initial granular permission catalogue.
- Validation limits/helpers.
- PostgreSQL/Prisma foundation schema for company/user/order/item/modifier/payment/idempotency/audit concepts.
- Secrets-safe `.env.example` and repository ignore rules.
- Automated financial-core tests and source-integrity verification script.

## Verification standard

Phase 00 is certified only as a clean **source foundation**, not as a production deployment. The environment used to build this artifact has no package-registry connectivity, so dependency installation and the Next.js production build cannot be truthfully marked as executed here. Those checks remain mandatory before release and will be repeated whenever dependencies are available.

The dependency-free Phase 00 financial tests, TypeScript check for the financial core and source integrity checks are recorded in `VERIFICATION_RESULTS.txt`.
