import test from "node:test";
import assert from "node:assert/strict";
import {closeShiftAtomic,type ShiftRepository} from "../src/index.ts";
function repo(diffInput?:{pending?:number;open?:number}):ShiftRepository {
 let closed=false; let z=false; let audit=false;
 const r:any={
 transaction:async(fn:any)=>fn(r), lockShift:async()=>({id:"s1",status:closed?"CLOSED":"OPEN",openingCash:1000n,userId:"u1",terminalId:"t1"}),
 countPendingPayments:async()=>diffInput?.pending??0,countOpenOrdersForShift:async()=>diffInput?.open??0,
 summarizeCashLedger:async()=>({cashPayments:5000n,cashRefunds:500n,cashPaymentReversals:0n,cashIn:0n,cashOut:0n,safeDrops:1000n,adjustments:0n}),
 closeShift:async()=>{closed=true},createZSnapshot:async()=>{z=true;return{id:"z1",reportNumber:"Z-000001"}},appendAudit:async()=>{audit=true}
 }; r.flags=()=>({closed,z,audit}); return r;
}
test("close creates immutable Z context before final close in one transaction",async()=>{const r:any=repo(); const out=await closeShiftAtomic(r,{shiftId:"s1",countedCash:4500n,actorUserId:"u1",varianceApprovalThreshold:500n,idempotencyKey:"z1"}); assert.equal(out.expectedCash,4500n); assert.deepEqual(r.flags(),{closed:true,z:true,audit:true});});
test("variance beyond threshold requires approval",async()=>{const r=repo(); await assert.rejects(()=>closeShiftAtomic(r,{shiftId:"s1",countedCash:3000n,actorUserId:"u1",varianceApprovalThreshold:500n,idempotencyKey:"z2"}),/VARIANCE_APPROVAL_REQUIRED/);});
test("pending payment prevents Z creation",async()=>{const r:any=repo({pending:1}); await assert.rejects(()=>closeShiftAtomic(r,{shiftId:"s1",countedCash:4500n,actorUserId:"u1",varianceApprovalThreshold:500n,idempotencyKey:"z3"}),/PENDING_PAYMENTS/); assert.equal(r.flags().z,false);});
