# Phase 07 API Contract — Void, Refund, Corrections & Audit

This phase uses explicit financial/operational commands rather than a generic order PATCH.

## Commands

- `POST /orders/:orderId/items/:orderItemId/void`
  - Requires authenticated actor + `voids.item` permission.
  - OPEN + UNPAID only.
  - Validates item belongs to the order and remaining unvoided quantity.
  - Persists `OrderItemVoid`, recalculates authoritative open-order totals, writes `ITEM_VOIDED` audit.

- `POST /orders/:orderId/void`
  - Requires `voids.order`; manager approval according to policy.
  - OPEN + UNPAID only. Paid/partially-paid orders return `PAID_ORDER_REQUIRES_REFUND`.
  - Persists `OrderVoid`, marks operational state VOIDED, releases active table assignments, writes audit.

- `POST /orders/:orderId/refunds`
  - Requires `refunds.create`; approval according to policy.
  - Requires reason + idempotency key.
  - Locks order/ledger, recomputes remaining refundable value, creates immutable `Refund` + `PaymentTransaction(type=REFUND)`.
  - Selected-item mode additionally persists `RefundAllocation` using historical gross/discount/tax/total snapshots and quantity limits.
  - Cannot exceed remaining refundable amount/quantity.

- `POST /orders/:orderId/payments/:paymentId/correct`
  - Requires `payments.correct`; approval according to policy.
  - Original payment must belong to this order.
  - Requires reason + idempotency key.
  - Creates `REVERSAL` for the original tender and a new `PAYMENT` for the corrected tender. The original row is never updated/deleted.

- `GET /orders/:orderId/audit`
  - Returns chronological actor/approver/reason/action history according to permission.

## Required server behavior

All sensitive commands resolve actor identity from the authenticated session, validate permission server-side, consume action-bound manager approval where configured, and execute state/ledger/audit changes within the same database transaction. Financial writes are retry-safe via idempotency. UI-hidden actions are still forbidden at the API layer.

## Refund semantics

`PAYMENT` adds paid value. `REVERSAL` cancels a mistaken finalized payment. `REFUND` returns money from a completed sale. `VOID` is an operational cancellation of an unpaid order/item and is not a refund. `COMP` remains a discount concern, not a void.

For a historical order line, partial-quantity refund allocation deterministically divides stored line gross/discount/tax/total minor units across sold units, preserving every minor unit across the complete quantity.

## External Card/Online boundary

V1 Card/Online are manual/external tenders. SwiftTill records the financial correction/refund only after the authorized operator confirms the external action; it does not claim processor authorization without an integration.
