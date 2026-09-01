# SwiftTill production release checklist

## Automated/source gates
- [x] Parent Phase 13 SHA verified.
- [x] Full inherited automated suite passes: 129/129.
- [x] Phase 13 security/concurrency verifier passes.
- [x] Source manifest can be regenerated and verified.
- [x] Release ZIP integrity checked.

## Required target-environment gates before go-live
- [ ] `npm install`/approved lockfile install succeeds from the production dependency source.
- [ ] `npm run build` succeeds with Next.js.
- [ ] PostgreSQL migration chain rehearsed on a restored production-like database.
- [ ] Backup created, hash recorded and restore rehearsal passed.
- [ ] Two-terminal race tests passed for table assignment and order-version conflicts.
- [ ] Duplicate payment/refund requests prove idempotent.
- [ ] Financial reconciliation returns expected zero difference on controlled test data.
- [ ] Admin/Cashier/Waiter/Manager authorization matrix tested against real API routes.
- [ ] Desktop and target tablet/touch workflows tested.
- [ ] Keyboard shortcuts and accessibility smoke tests completed.
- [ ] Windows USB 80mm printer tested; 58mm tested if used.
- [ ] Cash drawer pulse tested on actual hardware.
- [ ] Printer-offline scenario proves completed payment remains committed.
- [ ] Receipt, duplicate, partial-payment, refund and Z documents verified.
- [ ] Production secrets injected from secret store; no real `.env` committed.
- [ ] Monitoring/log retention and database backup schedule enabled.

Go-live is blocked until every applicable unchecked item is completed on the target environment.
