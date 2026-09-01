# SwiftTill Phase 07 Certification

Phase 07 was built directly on the exact certified Phase 06 archive.

Parent artifact: `SwiftTill-Phase-06-Payments-Split-Tender-CERTIFIED.zip`  
Parent SHA-256: `bb1ef67adfab98ee7d6fbd26820f6e11cfc5bbe8a58f660d3fb775e17f1a3419`

## Certified scope

- Unpaid OPEN-order void guard: paid/partially-paid orders require correction/refund instead of destructive void.
- Immutable whole-order `OrderVoid` with reason, performer and approver; active tables are released through the transaction service contract.
- Immutable `OrderItemVoid` quantity/value events and mandatory authoritative open-order total recalculation contract.
- Persistent `Refund` and `RefundAllocation` schema.
- Partial-quantity item refund allocation based on historical line gross, discount, tax and total snapshots.
- Deterministic minor-unit allocation so partial quantities preserve every stored minor unit.
- Remaining-refundable and remaining-quantity protection; repeat/over-refund rejection.
- Refund idempotency and transaction-bound ledger/audit service contract.
- Payment-mode correction as original PAYMENT + REVERSAL + replacement PAYMENT; no original tender mutation.
- Self-reference database FK/index foundation for correction lineage through `originalTransactionId`.
- Cross-order payment/item ownership protection.
- Separate `performedBy` and `approvedBy` audit context.
- Refund and payment-correction POS workspaces with explicit no-fake-data boundaries.
- Existing Phase 00–06 regression suites preserved.

## Important boundaries

Card and Online remain manual/external tenders in V1. SwiftTill may record a confirmed refund/correction but does not claim bank-side authorization or refund success without a real processor integration.

Phase 07 establishes the domain/schema/service contract. Full API adapters require the production database/session runtime that will be connected during backend integration. Phase 08 shifts/drawer/X-Z, Phase 09 receipt/refund document rendering, and Phase 11 physical USB printer integration are not falsely claimed here.

## Certification rule

“Certified” means the source/domain checks executable in this workspace passed. It does not claim tests that could not be executed, external infrastructure validation, or physical hardware validation.

## Verification result

70/70 automated tests passed across Phases 00–07. `correction-core` and `payment-core` passed strict TypeScript no-emit checks. Phase 07 source/security/integrity verification passed. The Next.js production build was attempted but cannot execute in this isolated package because `next` is not installed; this is recorded as a limitation, not a pass.
