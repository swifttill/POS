import test from "node:test";
import assert from "node:assert/strict";
import {
  combineOpenOrders,
  filterOpenOrders,
  holdOpenOrder,
  mergeOrderTable,
  moveOrderTable,
  recentOrders,
  unmergeOrderTable,
  validateTypeChangeTarget,
  type OpenOrderState,
  type OrderManagementRepository,
  type OrderManagementTransaction,
} from "../src/order-management.ts";

const baseOrder: OpenOrderState = {
  id: "o1", type: "DINE_IN", operationalStatus: "OPEN", financialStatus: "UNPAID", version: 4,
  pax: 2, waiterId: "u1", tables: [{ tableId: "t1", isPrimary: true }],
};

function repoFor(state: OpenOrderState, events: string[] = []): OrderManagementRepository {
  const tx: OrderManagementTransaction = {
    async getOrderForUpdate(id) { events.push(`LOCK:${id}`); return id === state.id ? state : { ...state, id }; },
    async assertTableAvailable(id) { events.push(`AVAILABLE:${id}`); },
    async markHeld(id) { events.push(`HOLD:${id}`); },
    async clearHeld(id) { events.push(`RECALL:${id}`); },
    async moveTable(id, from, to) { events.push(`MOVE:${id}:${from}:${to}`); },
    async mergeTable(id, table) { events.push(`MERGE:${id}:${table}`); },
    async unmergeTable(id, table) { events.push(`UNMERGE:${id}:${table}`); },
    async transferWaiter(id, waiter) { events.push(`TRANSFER:${id}:${waiter}`); },
    async changeType(id, type) { events.push(`TYPE:${id}:${type}`); },
    async releaseAllTables(id) { events.push(`RELEASE:${id}`); },
    async combineOrders(destination, source) { events.push(`COMBINE:${destination}:${source}`); },
    async appendAudit(input) { events.push(`AUDIT:${input.action}`); },
  };
  return { async runSerializable(work) { events.push("BEGIN"); const result = await work(tx); events.push("COMMIT"); return result; } };
}

test("holding an open order is server-persisted and audited inside a transaction", async () => {
  const events: string[] = [];
  await holdOpenOrder(repoFor(baseOrder, events), { orderId: "o1", expectedVersion: 4, actorUserId: "cashier" });
  assert.deepEqual(events, ["BEGIN", "LOCK:o1", "HOLD:o1", "AUDIT:ORDER_HELD", "COMMIT"]);
});

test("stale order version is rejected before a table move", async () => {
  const events: string[] = [];
  await assert.rejects(moveOrderTable(repoFor(baseOrder, events), { orderId: "o1", expectedVersion: 3, actorUserId: "u1", sourceTableId: "t1", destinationTableId: "t2" }), /ORDER_VERSION_CONFLICT/);
  assert.equal(events.includes("MOVE:o1:t1:t2"), false);
});

test("move table checks destination availability and records the move atomically", async () => {
  const events: string[] = [];
  await moveOrderTable(repoFor(baseOrder, events), { orderId: "o1", expectedVersion: 4, actorUserId: "u1", sourceTableId: "t1", destinationTableId: "t2" });
  assert.deepEqual(events, ["BEGIN", "LOCK:o1", "AVAILABLE:t2", "MOVE:o1:t1:t2", "AUDIT:TABLE_MOVED", "COMMIT"]);
});

test("merge adds only an available, previously-unlinked table", async () => {
  await assert.rejects(mergeOrderTable(repoFor(baseOrder), { orderId: "o1", expectedVersion: 4, actorUserId: "u1", tableId: "t1" }), /TABLE_ALREADY_ASSIGNED_TO_ORDER/);
  const events: string[] = [];
  await mergeOrderTable(repoFor(baseOrder, events), { orderId: "o1", expectedVersion: 4, actorUserId: "u1", tableId: "t2" });
  assert.ok(events.includes("AVAILABLE:t2"));
  assert.ok(events.includes("MERGE:o1:t2"));
});

test("the last physical table cannot be unmerged from a dine-in order", async () => {
  await assert.rejects(unmergeOrderTable(repoFor(baseOrder), { orderId: "o1", expectedVersion: 4, actorUserId: "u1", tableId: "t1" }), /LAST_TABLE_CANNOT_BE_UNMERGED/);
  const merged = { ...baseOrder, tables: [{ tableId: "t1", isPrimary: true }, { tableId: "t2", isPrimary: false }] };
  const events: string[] = [];
  await unmergeOrderTable(repoFor(merged, events), { orderId: "o1", expectedVersion: 4, actorUserId: "u1", tableId: "t2" });
  assert.ok(events.includes("UNMERGE:o1:t2"));
});

test("order type targets require their operational context", () => {
  assert.throws(() => validateTypeChangeTarget("DINE_IN", {}), /TABLE_REQUIRED/);
  assert.throws(() => validateTypeChangeTarget("DINE_IN", { tableId: "t1", pax: 0 }), /INVALID_PAX/);
  assert.throws(() => validateTypeChangeTarget("DELIVERY", {}), /DELIVERY_ADDRESS_REQUIRED/);
  validateTypeChangeTarget("TAKEAWAY", {});
});

test("combine accepts only two distinct open unpaid orders and remains transactional", async () => {
  const events: string[] = [];
  await combineOpenOrders(repoFor(baseOrder, events), { destinationOrderId: "o1", sourceOrderId: "o2", destinationVersion: 4, sourceVersion: 4, actorUserId: "manager" });
  assert.ok(events.includes("COMBINE:o1:o2"));
  assert.ok(events.includes("AUDIT:ORDERS_COMBINED"));
  await assert.rejects(combineOpenOrders(repoFor(baseOrder), { destinationOrderId: "o1", sourceOrderId: "o1", destinationVersion: 4, sourceVersion: 4, actorUserId: "manager" }), /CANNOT_COMBINE_ORDER_WITH_ITSELF/);
  const partiallyPaid = { ...baseOrder, financialStatus: "PARTIALLY_PAID" as const };
  await assert.rejects(combineOpenOrders(repoFor(partiallyPaid), { destinationOrderId: "o1", sourceOrderId: "o2", destinationVersion: 4, sourceVersion: 4, actorUserId: "manager" }), /COMBINE_REQUIRES_UNPAID_ORDER/);
});

test("open-order search/filter and recent sorting are deterministic", () => {
  const orders = [
    { id: "a", orderNumber: 101n, type: "DINE_IN" as const, financialStatus: "UNPAID" as const, tableName: "T4", waiterName: "Ali", openedAt: new Date(1), updatedAt: new Date(10), total: 100n, balanceDue: 100n, held: true },
    { id: "b", orderNumber: 102n, type: "TAKEAWAY" as const, financialStatus: "PARTIALLY_PAID" as const, customerName: "Sara", customerPhone: "0300123", waiterName: "Sara", openedAt: new Date(2), updatedAt: new Date(20), total: 200n, balanceDue: 50n, held: false },
  ];
  assert.equal(filterOpenOrders(orders, { query: "T4" })[0].id, "a");
  assert.equal(filterOpenOrders(orders, { financialStatus: "PARTIALLY_PAID" })[0].id, "b");
  assert.equal(filterOpenOrders(orders, { heldOnly: true })[0].id, "a");
  assert.equal(recentOrders(orders, 1)[0].id, "b");
});
