import test from "node:test";
import assert from "node:assert/strict";
import {expectedCash,variance,requiresVarianceApproval,assertShiftCanClose,assertCashMovement} from "../src/index.ts";

test("expected drawer uses only physical cash movements",()=>{
 assert.equal(expectedCash({openingCash:10000n,cashPayments:50000n,cashRefunds:3000n,cashPaymentReversals:2000n,cashIn:5000n,cashOut:4000n,safeDrops:10000n,adjustments:1000n}),47000n);
});
test("variance reports over and short",()=>{ assert.equal(variance(11000n,10000n),1000n); assert.equal(variance(9000n,10000n),-1000n); });
test("variance threshold is absolute and only above threshold",()=>{ assert.equal(requiresVarianceApproval(-501n,500n),true); assert.equal(requiresVarianceApproval(500n,500n),false); });
test("pending payments block close",()=>assert.throws(()=>assertShiftCanClose({status:"OPEN",pendingPayments:1,openOrders:0}),/PENDING_PAYMENTS/));
test("open orders require explicit override",()=>{ assert.throws(()=>assertShiftCanClose({status:"OPEN",pendingPayments:0,openOrders:2}),/OPEN_ORDERS/); assert.doesNotThrow(()=>assertShiftCanClose({status:"OPEN",pendingPayments:0,openOrders:2,managerOverrideOpenOrders:true})); });
test("closed shift cannot close twice",()=>assert.throws(()=>assertShiftCanClose({status:"CLOSED",pendingPayments:0,openOrders:0}),/SHIFT_NOT_OPEN/));
test("cash movement requires positive amount and reason",()=>{ assert.throws(()=>assertCashMovement("CASH_OUT",0n,"x"),/AMOUNT/); assert.throws(()=>assertCashMovement("SAFE_DROP",100n," "),/REASON/); assert.doesNotThrow(()=>assertCashMovement("SAFE_DROP",100n,"Bank drop")); });
