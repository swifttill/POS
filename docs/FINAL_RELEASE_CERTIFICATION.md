# SwiftTill Final Release — source certification

This package is the clean release candidate assembled from the verified Phase 13 certified parent. It preserves the locked restaurant-POS scope and all prior financial, security, printing and accessibility contracts.

## Certified here
- Exact parent SHA continuity.
- Full inherited automated regression suite: 129/129 tests.
- Source/security/concurrency verification.
- Release documentation for deployment, backup/restore and go-live gates.
- Clean source packaging without `.git`, `.env`, `node_modules`, `.next`, logs or nested ZIP artifacts.
- SHA-256 source manifest and archive integrity verification.

## Not certified in this sandbox
- Dependency installation / Next.js production compilation because registry dependency installation did not complete in the available environment.
- Live PostgreSQL migration rehearsal.
- Real multi-terminal load/concurrency behavior against PostgreSQL.
- Physical browser/device/screen-reader matrix.
- Physical Windows USB thermal printer and cash drawer.

Therefore this artifact is a FINAL SOURCE RELEASE CANDIDATE. Production go-live requires the target-environment gates in `PRODUCTION_CHECKLIST.md`.
