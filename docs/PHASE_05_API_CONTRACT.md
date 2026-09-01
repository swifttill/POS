# Phase 05 API / Service Contract

Phase 05 defines domain behavior; transport routes can be wired when the runtime/database layer is connected.

## Discount commands

- `POST /orders/:orderId/discounts`
  - requires authenticated actor and `discounts.apply_preset` or `discounts.apply_custom` as appropriate
  - input identifies rule/source/scope/target item IDs/reason and expected order version
  - client-supplied discount amount is never authoritative
  - server resolves eligible gross, rule value, stacking, actor cap and approval requirement
  - order-level discount is deterministically allocated to eligible lines
  - custom/comp reason is persisted
  - approval, when required, is action/order/requestor/context bound and consumed atomically with the adjustment
  - emits `DISCOUNT_APPLIED`

- `POST /orders/:orderId/discounts/:discountId/remove`
  - open-order workflow only
  - never hard-deletes the historical application row
  - marks it inactive/removed and recalculates authoritative totals
  - emits `DISCOUNT_REMOVED`

## Split-bill commands

- `POST /orders/:orderId/splits`
  - requires `orders.split_bill`
  - V1 requires `OPEN + UNPAID`
  - locks the order and validates `expectedVersion`
  - methods: `EVEN` or `ITEMS`
  - `ITEMS` assigns whole persisted lines exactly once in V1
  - persisted plan total must equal authoritative order total
  - at most one OPEN split plan per parent order
  - emits `BILL_SPLIT_CREATED`

- `POST /orders/:orderId/splits/:splitId/revert`
  - allowed only while every part has zero financial settlement
  - marks the split plan `REVERTED`; it is not deleted
  - emits `BILL_SPLIT_REVERTED`

## Explicit boundary

Split Tender is not implemented by these endpoints. Cash/Card/Online settlement of one order or split part belongs to Phase 06.
