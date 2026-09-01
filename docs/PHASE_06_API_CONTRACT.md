# Phase 06 API Contract — Payments

## Command
`POST /orders/:orderId/payments`

Requires authenticated actor, `payments.create`, a non-empty idempotency key, an OPEN payable order, and server-authoritative balance calculation.

Request intent contains tender lines only: `CASH | CARD | ONLINE`, requested amount, cash tendered amount where applicable, optional manual external reference, and optional split-part ID. The client never supplies authoritative order total, paid amount, change, or financial status.

The service locks/reloads the order in a database transaction, derives prior valid payments, applies the plan, writes one immutable PAYMENT ledger row per tender, updates financial status, writes audit, and stores the idempotent result.

Cash: applied amount is capped to the intended remaining amount; excess tender is `changeGiven`, not revenue. Card/Online may not exceed balance. Partial payment leaves `PARTIALLY_PAID`. Split tender remains one bill with multiple payment rows and is distinct from Split Bill.

Printer invocation is explicitly outside this financial transaction.
