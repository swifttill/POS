# SwiftTill Phase 01 Certification

## Scope
Phase 01 continues directly from the certified Phase 00 baseline. It adds the identity, access-control and company-settings foundation without implementing fake POS financial actions.

## Completed
- Four system-role presets: Admin, Manager, Cashier, Waiter.
- Granular permission-key model with server-side assertion helper.
- User-specific PIN security core using salted scrypt hashes and timing-safe verification.
- Weak-PIN validation and temporary escalating login throttling primitives.
- Database models for roles, permissions, role assignment, revocable sessions, manager approvals and security throttle state.
- Company profile fields for legal/business identity and tax label.
- Company/regional/tax settings validation core.
- Phase 01 full-screen responsive administration preview.
- Phase 00 financial core and USB-only product direction preserved.

## Security invariants
- PIN plaintext is never stored by the security core.
- Login design verifies a selected user rather than scanning all employee hashes.
- Authorization uses granular permissions, not client-provided role claims.
- Manager approval is modeled separately from the performing user and is action/entity bound.
- Historical users are intended to be deactivated rather than deleted.

## Verification requirements
Certification requires all dependency-free tests, source-integrity checks, secret scan and archive integrity checks to pass. A full Next.js production build is only certified if dependencies can be installed in the execution environment.
