import { applyPaymentPlan, assertIdempotencyReuse, paymentFingerprint, type PaymentLine } from "./index.ts";
export interface PaymentOrder { id:string; total:number; financialStatus:string; operationalStatus:string; version:number }
export interface ExistingPayment { amount:number }
export interface PaymentRepository {
  transaction<T>(work:(tx:PaymentRepository)=>Promise<T>):Promise<T>;
  lockOrder(orderId:string):Promise<PaymentOrder|null>;
  listValidPayments(orderId:string):Promise<readonly ExistingPayment[]>;
  findIdempotency(key:string):Promise<{fingerprint:string;result:unknown}|null>;
  createPayment(data:{orderId:string;tender:string;amount:number;tenderedAmount:number;changeGiven:number;reference?:string;performedByUserId:string;idempotencyKey:string;splitPartId?:string}):Promise<{id:string}>;
  setOrderFinancialStatus(orderId:string,status:"PARTIALLY_PAID"|"PAID"):Promise<void>;
  createIdempotency(data:{key:string;fingerprint:string;result:unknown}):Promise<void>;
  audit(data:{action:string;entityId:string;actorUserId:string;metadata:unknown}):Promise<void>;
}
export async function recordPayments(repo:PaymentRepository,input:{orderId:string;actorUserId:string;idempotencyKey:string;lines:readonly PaymentLine[];splitPartId?:string}){
  if(!input.idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  const fingerprint=paymentFingerprint(input);
  return repo.transaction(async tx=>{
    const existing=await tx.findIdempotency(input.idempotencyKey); if(existing){assertIdempotencyReuse(existing.fingerprint,fingerprint);return existing.result;}
    const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND");
    if(order.operationalStatus!=="OPEN") throw new Error("PAYMENT_REQUIRES_OPEN_ORDER");
    if(order.financialStatus==="PAID"||order.financialStatus==="FULLY_REFUNDED") throw new Error("ORDER_ALREADY_PAID");
    const prior=(await tx.listValidPayments(order.id)).reduce((s,p)=>s+p.amount,0);
    const plan=applyPaymentPlan(order.total,prior,input.lines); const ids:string[]=[];
    for(let i=0;i<plan.payments.length;i++){const p=plan.payments[i];const row=await tx.createPayment({orderId:order.id,tender:p.tender,amount:p.appliedAmount,tenderedAmount:p.tenderedAmount,changeGiven:p.changeGiven,reference:p.reference,performedByUserId:input.actorUserId,idempotencyKey:`${input.idempotencyKey}:${i+1}`,splitPartId:input.splitPartId});ids.push(row.id);}
    if(plan.totalApplied>0) await tx.setOrderFinancialStatus(order.id,plan.status==="PAID"?"PAID":"PARTIALLY_PAID");
    const result={orderId:order.id,paymentIds:ids,...plan}; await tx.audit({action:"PAYMENT_RECORDED",entityId:order.id,actorUserId:input.actorUserId,metadata:{paymentIds:ids,balanceDue:plan.balanceDue,tenders:plan.payments.map(p=>p.tender)}}); await tx.createIdempotency({key:input.idempotencyKey,fingerprint,result}); return result;
  });
}
