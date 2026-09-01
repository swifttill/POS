# SwiftTill deployment runbook

## Supported production shape
- Node.js 22+
- PostgreSQL
- Next.js web application
- Windows POS workstation for direct USB printing
- SwiftTill Windows Print Service bound to 127.0.0.1 only

## Environment
Copy `.env.example` to the deployment secret store. Never commit `.env`.
Required values currently documented by the source are `DATABASE_URL` and a long random `SESSION_SECRET`.

## Release sequence
1. Take and verify a PostgreSQL backup before schema changes.
2. Deploy into staging using the exact release artifact and production-equivalent environment variables.
3. Install dependencies from the project workspace and run `npm run verify`.
4. Run the Next.js production build. Do not promote if it fails.
5. Rehearse all Prisma SQL migrations against a restored production-like database before applying them to production.
6. Put the application into a controlled maintenance/deployment window when required by the migration plan.
7. Apply migrations in numeric order from `prisma/migrations` using the organization's approved PostgreSQL migration process.
8. Start the web application and execute smoke tests: login, menu load, Dine-in table lock, Takeaway, Delivery, hold/recall, discount approval, split bill, each tender, partial payment, refund/correction, shift close, receipt/reprint and reports.
9. On each Windows POS, install/configure the local print service, select the installed USB printer and verify receipt + drawer hardware.
10. Monitor application errors, reconciliation differences and print failures after promotion.

## Promotion gates
Production promotion requires a successful dependency install, Next.js build, live migration rehearsal, multi-client concurrency checks, browser/device checks, and physical printer/drawer verification. Source certification alone is not deployment certification.

## Rollback
Application code may be rolled back to the previously deployed immutable release. Database rollback must not be improvised: restore the verified pre-deployment backup when a migration is not safely forward-fixable. Never rewrite or delete finalized financial ledger, receipt, refund, Z-report or audit history to simulate rollback.
