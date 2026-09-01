# SwiftTill rc.5 — 360° Runtime Integration Audit

Parent: `SwiftTill-v1.0.0-rc.4-UI-Polish-CERTIFIED.zip` (`9ce6340cd1b7dc2978994ad038191cfdd69683bed31bf7691deae8303fb07a1d`).

## Critical rc.4 findings repaired
- Added `pnpm-workspace.yaml`; rc.4 used npm workspace metadata only, which pnpm did not honor.
- Declared Prisma CLI/client dependencies in the web workspace.
- Replaced the non-executable Phase 00 marker with an executable PostgreSQL foundation for tables required by later migrations.
- Fixed Windows ESM path handling in the source verifier with `fileURLToPath`.
- Added a Prisma singleton and real Next.js API routes.
- Added database health, staff login/logout/session, company, catalogue, tables, orders, payment, access-read, report-summary and shift APIs.
- Connected Login, POS catalogue/table/order creation, Open Orders, Tables and Payment screens to real APIs.
- Added server-side permission resolution where explicit user DENY overrides ALLOW and active-role grants.
- Added server-authoritative menu/variant/modifier pricing and tax calculation for order creation/update.
- Added serializable order creation, database table-occupancy invariant use, sequence order numbers, optimistic order version checks, idempotent payments, cash change separation and non-cash overpayment rejection.
- Added secure first-admin CLI bootstrap. No default PIN or production secret is shipped.

## Safety / migration note
Do **not** run `migrate reset` or `db push` against an existing production database. The rc.4 migration history was never a complete executable chain because `0001_foundation` was only a marker. Before deploying rc.5 to an existing database, take a backup and run `prisma migrate status`; reconcile any pre-existing `_prisma_migrations` history deliberately. A clean/new database can use the repaired chain after Prisma validation.

## Remaining external certification
Source verification cannot prove a user's remote PostgreSQL credentials, network reachability, existing database migration history, card processor behavior, or physical Windows USB printer/drawer hardware. Those require the target Windows machine/environment. The package therefore provides explicit commands and health endpoints for final environment certification rather than claiming those external systems were tested here.
