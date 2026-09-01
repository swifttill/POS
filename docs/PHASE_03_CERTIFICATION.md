# SwiftTill Phase 03 Certification

Status: **CERTIFIED SOURCE MILESTONE**

Parent artifact: `SwiftTill-Phase-02-Menu-Catalogue-CERTIFIED.zip`  
Parent SHA-256: `35f582697d53e2dbb43461d6290a904f5ab3245ed80471d9db99056350318fec`

## Scope certified

- Full-screen `/pos` workstation source with the locked category/product/current-order architecture.
- Responsive desktop/tablet/mobile layout foundations.
- Dine-in, Takeaway and Delivery context model.
- Dine-in table + pax validation and Delivery address requirement.
- Integer-minor-unit cart line/gross calculations including modifier snapshots.
- Quantity update/removal and bounded order-note rules.
- PostgreSQL Customer, RestaurantTable and OrderTable schema/migration foundation.
- DB-level partial unique index for one active order assignment per physical table.
- Transaction-bound create-open-order service contract: availability check, create order and table assignment occur inside one repository transaction boundary.
- Order customer/table/delivery historical context snapshot fields.
- Phase 02 server-authoritative menu pricing contract preserved.
- No fake products, fake table occupancy or fake checkout is presented as production behavior.
- Payment remains disabled until its ledger phase.
- USB-only direct thermal printer direction preserved; Phase 03 does not fake printer readiness.

## Verification

Automated regression/domain tests: **23/23 PASS**

- Phase 00 financial core: 5/5
- Phase 01 security/settings: 5/5
- Phase 02 catalogue/pricing: 6/6
- Phase 03 POS/tables/cart: 7/7

Additional checks:

- Phase 03 source verification: PASS
- POS core TypeScript source check with system TypeScript 5.8.3: PASS
- Phase 00 financial TypeScript source regression check: PASS
- Secret-pattern/source integrity scan: PASS
- Parent Phase 02 continuity recorded by SHA-256: PASS

## Runtime limitation recorded, not hidden

The npm registry is unreachable from this execution environment (`EAI_AGAIN`), therefore third-party Next.js/React dependencies cannot be freshly installed and a truthful `next build` certification cannot be performed here yet. Domain tests and dependency-free TypeScript checks were executed locally. This milestone must not be described as a fully runtime/deployment-certified release until dependency installation and production build are executed successfully in a network-enabled environment.

## Phase boundary

Phase 04 is **not included**. Open-order recall management, move/merge tables, transfers and full order-type correction workflows remain next. Discounts, payments and USB hardware printing remain in their dedicated later phases.
