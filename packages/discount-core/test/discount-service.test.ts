import test from "node:test";
import assert from "node:assert/strict";
import { applyDiscount, type DiscountRepository, type DiscountTransaction } from "../src/discount-service.ts";

const rule = { id:"r10", name:"10% Staff", type:"PERCENT" as const, scope:"ORDER" as const, value:1000, active:true, stackable:false, managerApprovalRequired:true };

function makeRepo(events:string[], totalAfter=900n): DiscountRepository {
  const tx:DiscountTransaction = {
    async getOrderForUpdate(id){events.push(`LOCK:${id}`);return {id,version:7,operationalStatus:"OPEN",financialStatus:"UNPAID",alreadyPaid:0n};},
    async getEligibleLines(){return [{orderItemId:"i1",eligibleGross:600n},{orderItemId:"i2",eligibleGross:400n}];},
    async getActiveDiscounts(){return [];},
    async persistDiscount(input){events.push(`PERSIST:${input.amount}:${input.allocations.map(x=>x.amount).join("+")}`);return "d1";},
    async consumeApproval(id){events.push(`APPROVAL:${id}`);},
    async recalculateOrderTotals(){events.push("RECALC");return {total:totalAfter};},
    async appendAudit(input){events.push(`AUDIT:${input.action}`);},
  };
  return {async runSerializable(work){events.push("BEGIN");const result=await work(tx);events.push("COMMIT");return result;}};
}

const approval = { action:"DISCOUNT_APPLY", entityId:"o1", requestedById:"cashier", contextHash:"hash", expiresAt:new Date("2030-01-01"), usedAt:null };

test("discount application locks, allocates, consumes approval, recalculates and audits in one transaction", async()=>{
  const events:string[]=[];
  const result=await applyDiscount(makeRepo(events),{orderId:"o1",expectedVersion:7,actorUserId:"cashier",rule,source:"PRESET",reason:"Staff meal",approvalId:"a1",approvedByUserId:"manager",authority:{actorCanApplyPreset:true,actorCanApplyCustom:false,actorMaxPercentBps:500,approval,expectedContextHash:"hash",now:new Date("2029-01-01")}});
  assert.deepEqual(result,{discountId:"d1",amount:100n,total:900n});
  assert.deepEqual(events,["BEGIN","LOCK:o1","PERSIST:100:60+40","APPROVAL:a1","RECALC","AUDIT:DISCOUNT_APPLIED","COMMIT"]);
});

test("stale order version blocks discount before persistence", async()=>{
  const events:string[]=[];
  await assert.rejects(applyDiscount(makeRepo(events),{orderId:"o1",expectedVersion:6,actorUserId:"cashier",rule,source:"PRESET",approvalId:"a1",approvedByUserId:"manager",authority:{actorCanApplyPreset:true,actorCanApplyCustom:false,actorMaxPercentBps:500,approval,expectedContextHash:"hash",now:new Date("2029-01-01")}}),/ORDER_VERSION_CONFLICT/);
  assert.equal(events.some(e=>e.startsWith("PERSIST")),false);
});

test("discount cannot silently reduce authoritative total below already-paid amount", async()=>{
  const events:string[]=[];
  const txRepo=makeRepo(events,400n);
  // Override order lock to model an order with 500 already paid.
  const originalRun=txRepo.runSerializable.bind(txRepo);
  const repo:DiscountRepository={runSerializable(work){return originalRun(async tx=>work({...tx,async getOrderForUpdate(id){events.push(`LOCKPAID:${id}`);return {id,version:7,operationalStatus:"OPEN",financialStatus:"PARTIALLY_PAID",alreadyPaid:500n};}}));}};
  await assert.rejects(applyDiscount(repo,{orderId:"o1",expectedVersion:7,actorUserId:"cashier",rule,source:"PRESET",approvalId:"a1",approvedByUserId:"manager",authority:{actorCanApplyPreset:true,actorCanApplyCustom:false,actorMaxPercentBps:500,approval,expectedContextHash:"hash",now:new Date("2029-01-01")}}),/DISCOUNT_WOULD_REDUCE_TOTAL_BELOW_PAID/);
});
