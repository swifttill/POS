# Phase 03 POS service contract

This is the implementation contract for the API/service layer that will be wired to PostgreSQL once the runtime dependency layer is available.

## Bootstrap
`GET /api/pos/bootstrap` returns company display configuration, authenticated user/shift context, sellable catalogue projection, active tables and current table-order summaries. Prices are server-derived.

## Create/open order
`POST /api/orders` accepts order type plus context identifiers and selected catalogue identifiers. Dine-in requires table + pax. The server transaction must lock/check table assignment and create Order + OrderTable + line snapshots atomically.

`GET /api/tables/:id/active-order` returns the existing active parent order when occupied; UI must recall it rather than create a duplicate.

## Cart mutation
`PATCH /api/orders/:orderId` uses optimistic `version`. Item update/remove operations constrain both `itemId` and `orderId`; cross-order item mutation is invalid.

Client input contains IDs, selections, quantity and note only. Item/variant/modifier prices and sellability are resolved server-side from Phase 02 catalogue rules.

## Conflict codes
- `TABLE_OCCUPIED`
- `ORDER_VERSION_CONFLICT`
- `ITEM_UNAVAILABLE`
- `INVALID_VARIANT`
- `INVALID_MODIFIER_SELECTION`
- `INVALID_QUANTITY`
- `TABLE_REQUIRED`
- `PAX_REQUIRED`

## Phase boundary
Hold/recall, move/merge/transfer and order-type correction workflow are Phase 04. Discounts are Phase 05. Payment is Phase 06. No fake implementation is substituted before those phases.
