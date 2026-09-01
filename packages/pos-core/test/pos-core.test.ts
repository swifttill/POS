import test from "node:test";
import assert from "node:assert/strict";
import {
  addLine,
  assignTable,
  cartGrossSubtotal,
  changeOrderType,
  normalizeNote,
  removeLine,
  setLineQuantity,
  validateOrderContext,
  type PosOrderDraft,
} from "../src/index.ts";

const emptyTakeaway: PosOrderDraft = { type: "TAKEAWAY", lines: [] };

test("dine-in requires table and pax", () => {
  assert.throws(() => validateOrderContext({ type: "DINE_IN", lines: [] }), /TABLE_REQUIRED/);
  assert.throws(() => validateOrderContext({ type: "DINE_IN", tableId: "t1", lines: [] }), /PAX_REQUIRED/);
  validateOrderContext({ type: "DINE_IN", tableId: "t1", pax: 2, lines: [] });
});

test("a physical table cannot be assigned to two independent open orders", () => {
  const one = assignTable([], "t1", "order-a");
  assert.throws(() => assignTable(one, "t1", "order-b"), /TABLE_OCCUPIED/);
  assert.equal(assignTable(one, "t1", "order-a").length, 1);
});

test("cart gross includes modifiers and quantity using integer money", () => {
  const order = addLine(emptyTakeaway, {
    id: "l1", menuItemId: "burger", name: "Burger", unitBasePrice: 90000n, quantity: 2,
    modifiers: [{ modifierId: "cheese", name: "Cheese", priceDelta: 10000n }],
  });
  assert.equal(cartGrossSubtotal(order.lines), 200000n);
});

test("quantity updates and line removal are explicit and validated", () => {
  const order = addLine(emptyTakeaway, { id: "l1", menuItemId: "tea", name: "Tea", unitBasePrice: 20000n, quantity: 1, modifiers: [] });
  const changed = setLineQuantity(order, "l1", 3);
  assert.equal(changed.lines[0].quantity, 3);
  assert.throws(() => setLineQuantity(order, "l1", 0), /INVALID_QUANTITY/);
  assert.equal(removeLine(changed, "l1").lines.length, 0);
});

test("changing to dine-in requires table/pax and changing away releases table context", () => {
  assert.throws(() => changeOrderType(emptyTakeaway, "DINE_IN"), /TABLE_REQUIRED/);
  const dineIn = changeOrderType(emptyTakeaway, "DINE_IN", { tableId: "t4", pax: 3 });
  assert.equal(dineIn.tableId, "t4");
  const takeaway = changeOrderType(dineIn, "TAKEAWAY");
  assert.equal(takeaway.tableId, undefined);
  assert.equal(takeaway.pax, undefined);
});

test("delivery requires address and notes are bounded", () => {
  assert.throws(() => changeOrderType(emptyTakeaway, "DELIVERY"), /DELIVERY_ADDRESS_REQUIRED/);
  const delivery = changeOrderType(emptyTakeaway, "DELIVERY", { deliveryAddress: "Street 1" });
  assert.equal(delivery.deliveryAddress, "Street 1");
  assert.equal(normalizeNote("  no onions  "), "no onions");
  assert.throws(() => normalizeNote("x".repeat(301)), /NOTE_TOO_LONG/);
});

import { createOpenOrder, type PosOrderRepository } from "../src/order-service.ts";

test("createOpenOrder keeps table check, order creation and assignment inside one transaction boundary", async () => {
  const events: string[] = [];
  const repo: PosOrderRepository = {
    async runSerializable(work) {
      events.push("BEGIN");
      const result = await work({
        async assertTableAvailable(tableId) { events.push(`CHECK:${tableId}`); },
        async createOrder(input) { events.push(`CREATE:${input.grossSubtotal}`); return { id: "o1", orderNumber: 1n, version: 1, grossSubtotal: input.grossSubtotal }; },
        async assignTable(orderId, tableId) { events.push(`ASSIGN:${orderId}:${tableId}`); },
      });
      events.push("COMMIT");
      return result;
    },
  };
  const created = await createOpenOrder(repo, {
    type: "DINE_IN", tableId: "t4", pax: 2,
    lines: [{ id: "l1", menuItemId: "m1", name: "Burger", unitBasePrice: 10000n, quantity: 2, modifiers: [] }],
  });
  assert.equal(created.grossSubtotal, 20000n);
  assert.deepEqual(events, ["BEGIN", "CHECK:t4", "CREATE:20000", "ASSIGN:o1:t4", "COMMIT"]);
});
