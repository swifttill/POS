# SwiftTill v1.0.0-rc.3 Access Management Certification

Parent: `SwiftTill-v1.0.0-rc.2-Enterprise-Reporting-Access-CERTIFIED.zip`
Parent SHA-256: `8aa6e587737cf816acbee8afcf02e3c99945d4797c569c2a64e381bc4369e71b`

Added:
- Fully custom roles.
- Expanded granular permission catalogue.
- Multiple-role assignment preservation.
- Per-user `ALLOW / DENY / INHERIT` overrides.
- Deterministic effective permission resolution.
- Actor cannot grant privileges they do not possess.
- Final administrator protection.
- Protected system-role support.
- Transaction-oriented access-management service contracts.
- Immutable access audit contracts.
- Redesigned `/admin/access` role/user/audit workspace.
- Database migration `0016_custom_role_access`.

Runtime limitation: Next.js production compilation remains dependent on installing project dependencies in a network-enabled build environment. Source certification does not substitute for live PostgreSQL migration rehearsal or deployment testing.
