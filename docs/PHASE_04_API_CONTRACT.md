# Phase 04 API / service contract — Open Orders & Order Management

Phase 04 turns persisted OPEN orders into an operational control workflow. The UI must never mutate order relationships locally and then "save later"; every operation below is a server command protected by authentication, permissions, optimistic version checking and a database transaction.

## Required read APIs

- `GET /api/orders/open?query=&type=&financialStatus=&held=&cursor=` — paginated OPEN orders with table/customer/waiter/total/balance/version summaries.
- `GET /api/orders/recent?limit=20` — recent order summaries, bounded 1..100.
- `GET /api/orders/:id` — canonical persisted order, active table links, item snapshots, payments and current version.
- `GET /api/tables` — table state derived from active `OrderTable` assignments.

## Required command APIs

- `POST /api/orders/:id/hold`
- `POST /api/orders/:id/recall`
- `POST /api/orders/:id/move-table`
- `POST /api/orders/:id/merge-table`
- `POST /api/orders/:id/unmerge-table`
- `POST /api/orders/:id/transfer`
- `POST /api/orders/:id/change-type`
- `POST /api/orders/:id/combine`

Each write includes `expectedVersion`. Stale clients receive `409 ORDER_VERSION_CONFLICT` rather than silently overwriting another terminal.

## Invariants

1. Hold is persisted on the server (`heldAt`, `heldByUserId`); it is not a browser-only flag. Recall clears hold metadata but does not create a replacement order.
2. Move Table keeps the same order and financial history. The destination must be available inside the same transaction.
3. Merge Tables means one parent order linked to multiple physical tables. It never silently combines two independent occupied orders.
4. Unmerge cannot release the final table from a Dine-in order. A Dine-in order must continue to own at least one active physical table.
5. Change Dine-in → Takeaway/Delivery releases active table links atomically. Change to Dine-in requires a valid available table and pax. Delivery requires configured delivery context.
6. Staff transfer changes the operational waiter/server assignment; the authenticated payment actor remains separate.
7. Combine Orders is restricted to two distinct `OPEN + UNPAID` orders in V1. Partially paid or paid orders require later financial correction workflows and are not casually combined.
8. `OrderTable_one_active_order_per_table` remains the database guard against two parent orders using the same physical table.
9. `OrderTable_one_active_primary_per_order` ensures a merged order has no more than one active primary table link.
10. All mutations append audit events. The browser never supplies an authoritative `performedBy` identity; the server uses the authenticated actor.

## Error codes

Expected domain errors include `ORDER_NOT_OPEN`, `ORDER_VERSION_CONFLICT`, `TABLE_OCCUPIED`, `TABLE_NOT_ASSIGNED_TO_ORDER`, `LAST_TABLE_CANNOT_BE_UNMERGED`, `DINE_IN_REQUIRED`, `TABLE_REQUIRED`, `INVALID_PAX`, `DELIVERY_ADDRESS_REQUIRED`, `WAITER_REQUIRED`, `CANNOT_COMBINE_ORDER_WITH_ITSELF`, and `COMBINE_REQUIRES_UNPAID_ORDER`.

## Explicit Phase boundary

Phase 04 does not implement split bill, tender collection, refunds or final receipt printing. Those remain later financial/hardware phases. It also does not introduce KOT/KDS, inventory, suppliers, kitchen printer routing or ERP scope.
