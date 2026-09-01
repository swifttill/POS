import test from "node:test";
import assert from "node:assert/strict";
import { assertSplitRevertAllowed, persistSplitPlan, splitByWholeItems, splitEvenly, type SplitBillingRepository, type SplitBillingTransaction, type SplitOrderState } from "../src/split-billing.ts";

const order: SplitOrderState = { id: "o1", version: 3, operationalStatus: "OPEN", financialStatus: "UNPAID", total: 1000n };

test("even split preserves every minor unit deterministically", () => {
  assert.deepEqual(splitEvenly(order, 3).parts.map(p => p.total), [334n,333n,333n]);
});

test("item split assigns each whole order line exactly once", () => {
  const plan = splitByWholeItems(order, [{ orderItemId:"a", lineTotal:400n },{ orderItemId:"b", lineTotal:600n }], [{label:"Guest 1",orderItemIds:["a"]},{label:"Guest 2",orderItemIds:["b"]}]);
  assert.deepEqual(plan.parts.map(p => p.total), [400n,600n]);
  assert.throws(() => splitByWholeItems(order, [{ orderItemId:"a", lineTotal:400n },{ orderItemId:"b", lineTotal:600n }], [{label:"A",orderItemIds:["a"]},{label:"B",orderItemIds:["a"]}]), /SPLIT_ITEM_ASSIGNED_TWICE/);
});

test("V1 split creation refuses partially-paid orders", () => {
  assert.throws(() => splitEvenly({ ...order, financialStatus:"PARTIALLY_PAID" },2), /SPLIT_REQUIRES_UNPAID_ORDER/);
});

test("split cannot be reverted after any child bill has financial settlement", () => {
  assert.doesNotThrow(() => assertSplitRevertAllowed([{paidAmount:0n},{paidAmount:0n}]));
  assert.throws(() => assertSplitRevertAllowed([{paidAmount:0n},{paidAmount:1n}]), /SPLIT_ALREADY_FINANCIALLY_SETTLED/);
});

test("persisted split locks/version-checks order and audits atomically", async () => {
  const events:string[]=[];
  const tx:SplitBillingTransaction={
    async getOrderForUpdate(id){events.push(`LOCK:${id}`);return order;},
    async assertNoActiveSplit(id){events.push(`NO_SPLIT:${id}`);},
    async createSplit(input){events.push(`CREATE:${input.method}:${input.parts.length}`);return "s1";},
    async appendAudit(input){events.push(`AUDIT:${input.action}`);}
  };
  const repo:SplitBillingRepository={async runSerializable(work){events.push("BEGIN");const result=await work(tx);events.push("COMMIT");return result;}};
  const plan=splitEvenly(order,2);
  assert.equal(await persistSplitPlan(repo,{orderId:"o1",expectedVersion:3,actorUserId:"u1",plan}),"s1");
  assert.deepEqual(events,["BEGIN","LOCK:o1","NO_SPLIT:o1","CREATE:EVEN:2","AUDIT:BILL_SPLIT_CREATED","COMMIT"]);
});
