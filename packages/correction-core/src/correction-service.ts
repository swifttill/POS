import { assertIdempotencyReuse } from "../../payment-core/src/index.ts";
import { assertItemVoidAllowed, assertOrderVoidAllowed, assertPaymentCorrectionAllowed, assertRefundAmount, calculateItemRefund, deriveRefundedState, remainingRefundableAmount, type Tender } from "./index.ts";

export interface LedgerRow { id:string; orderId?:string; type:"PAYMENT"|"REVERSAL"|"REFUND"; tender:Tender; amount:number; originalTransactionId?:string|null; }
export interface CorrectionOrder { id:string; operationalStatus:string; financialStatus:any; total:number; }
export interface CorrectionRepository {
  transaction<T>(work:(tx:CorrectionRepository)=>Promise<T>):Promise<T>;
  lockOrder(orderId:string):Promise<CorrectionOrder|null>;
  listLedger(orderId:string):Promise<readonly LedgerRow[]>;
  findPayment(paymentId:string):Promise<LedgerRow|null>;
  findIdempotency(key:string):Promise<{fingerprint:string;result:unknown}|null>;
  createLedger(data:{orderId:string;type:"PAYMENT"|"REVERSAL"|"REFUND";tender:Tender;amount:number;originalTransactionId?:string;performedByUserId:string;approvedByUserId?:string;reason:string;idempotencyKey:string;refundId?:string}):Promise<{id:string}>;
  createRefund(data:{orderId:string;amount:number;reason:string;performedByUserId:string;approvedByUserId?:string;idempotencyKey:string}):Promise<{id:string}>;
  createOrderVoid(data:{orderId:string;reason:string;performedByUserId:string;approvedByUserId?:string}):Promise<{id:string}>;
  releaseActiveTables(orderId:string):Promise<void>;
  recalculateOpenOrderTotals?(orderId:string):Promise<void>;
  findOrderItem?(orderItemId:string):Promise<{id:string;orderId:string;quantity:number;lineGross:number;lineDiscount:number;lineTax:number;lineTotal:number}|null>;
  listVoidedQuantity?(orderItemId:string):Promise<number>;
  createItemVoid?(data:{orderItemId:string;quantity:number;amount:number;reason:string;performedByUserId:string;approvedByUserId?:string}):Promise<{id:string}>;
  listRefundedQuantity?(orderItemId:string):Promise<number>;
  createRefundAllocation?(data:{refundId:string;orderItemId:string;quantity:number;grossAmount:number;discountAmount:number;taxAmount:number;totalAmount:number}):Promise<void>;
  setOrderOperationalStatus(orderId:string,status:"VOIDED"):Promise<void>;
  setOrderFinancialStatus(orderId:string,status:"PAID"|"PARTIALLY_REFUNDED"|"FULLY_REFUNDED"):Promise<void>;
  createIdempotency(data:{key:string;fingerprint:string;result:unknown}):Promise<void>;
  audit(data:{action:string;entityId:string;actorUserId:string;approverUserId?:string;reason:string;metadata?:unknown}):Promise<void>;
}
const fp=(x:unknown)=>JSON.stringify(x);

export async function refundOrder(repo:CorrectionRepository,input:{orderId:string;amount:number;tender:Tender;actorUserId:string;approvedByUserId?:string;reason:string;idempotencyKey:string}){
  if(!input.reason.trim()) throw new Error("REFUND_REASON_REQUIRED"); if(!input.idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  const fingerprint=fp({op:"refund",...input,approvedByUserId:input.approvedByUserId??null});
  return repo.transaction(async tx=>{
    const existing=await tx.findIdempotency(input.idempotencyKey); if(existing){assertIdempotencyReuse(existing.fingerprint,fingerprint);return existing.result;}
    const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND");
    const ledger=await tx.listLedger(order.id); const paid=ledger.filter(x=>x.type==="PAYMENT").reduce((s,x)=>s+x.amount,0); const refunded=ledger.filter(x=>x.type==="REFUND").reduce((s,x)=>s+x.amount,0); const reversed=ledger.filter(x=>x.type==="REVERSAL").reduce((s,x)=>s+x.amount,0);
    const remaining=remainingRefundableAmount({paid,refunded,reversed}); assertRefundAmount(remaining,input.amount);
    const refund=await tx.createRefund({orderId:order.id,amount:input.amount,reason:input.reason,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,idempotencyKey:input.idempotencyKey});
    const ledgerRow=await tx.createLedger({orderId:order.id,type:"REFUND",tender:input.tender,amount:input.amount,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,reason:input.reason,idempotencyKey:`${input.idempotencyKey}:ledger`,refundId:refund.id});
    const state=deriveRefundedState(paid-reversed,refunded+input.amount); await tx.setOrderFinancialStatus(order.id,state);
    const result={refundId:refund.id,ledgerTransactionId:ledgerRow.id,amount:input.amount,financialStatus:state,remainingRefundable:remaining-input.amount};
    await tx.audit({action:"REFUND_CREATED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason,metadata:{refundId:refund.id,amount:input.amount,tender:input.tender}}); await tx.createIdempotency({key:input.idempotencyKey,fingerprint,result}); return result;
  });
}

export async function correctPaymentTender(repo:CorrectionRepository,input:{orderId:string;paymentId:string;newTender:Tender;actorUserId:string;approvedByUserId?:string;reason:string;idempotencyKey:string}){
  if(!input.reason.trim()) throw new Error("PAYMENT_CORRECTION_REASON_REQUIRED"); if(!input.idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  const fingerprint=fp({op:"payment-correction",...input,approvedByUserId:input.approvedByUserId??null});
  return repo.transaction(async tx=>{
    const existing=await tx.findIdempotency(input.idempotencyKey); if(existing){assertIdempotencyReuse(existing.fingerprint,fingerprint);return existing.result;}
    const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND");
    const original=await tx.findPayment(input.paymentId); if(!original||original.type!=="PAYMENT"||original.orderId!==order.id) throw new Error("PAYMENT_NOT_FOUND");
    const ledger=await tx.listLedger(order.id); const reversals=ledger.filter(x=>x.type==="REVERSAL"&&x.originalTransactionId===original.id).reduce((s,x)=>s+x.amount,0); const refunds=ledger.filter(x=>x.type==="REFUND"&&x.originalTransactionId===original.id).reduce((s,x)=>s+x.amount,0);
    assertPaymentCorrectionAllowed({paymentAmount:original.amount,alreadyReversed:reversals,alreadyRefunded:refunds,newTender:input.newTender});
    const reversal=await tx.createLedger({orderId:order.id,type:"REVERSAL",tender:original.tender,amount:original.amount,originalTransactionId:original.id,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,reason:input.reason,idempotencyKey:`${input.idempotencyKey}:reverse`});
    const replacement=await tx.createLedger({orderId:order.id,type:"PAYMENT",tender:input.newTender,amount:original.amount,originalTransactionId:original.id,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,reason:input.reason,idempotencyKey:`${input.idempotencyKey}:replacement`});
    const result={originalPaymentId:original.id,reversalId:reversal.id,replacementPaymentId:replacement.id,amount:original.amount,fromTender:original.tender,toTender:input.newTender};
    await tx.audit({action:"PAYMENT_REVERSED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason,metadata:result}); await tx.audit({action:"PAYMENT_CORRECTED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason,metadata:result}); await tx.createIdempotency({key:input.idempotencyKey,fingerprint,result}); return result;
  });
}

export async function voidOpenOrder(repo:CorrectionRepository,input:{orderId:string;actorUserId:string;approvedByUserId?:string;reason:string}){
  if(!input.reason.trim()) throw new Error("VOID_REASON_REQUIRED");
  return repo.transaction(async tx=>{ const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND"); assertOrderVoidAllowed({operationalStatus:order.operationalStatus,financialStatus:order.financialStatus}); const row=await tx.createOrderVoid({orderId:order.id,reason:input.reason,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId}); await tx.setOrderOperationalStatus(order.id,"VOIDED"); await tx.releaseActiveTables(order.id); await tx.audit({action:"ORDER_VOIDED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason}); return {orderId:order.id,orderVoidId:row.id,status:"VOIDED" as const}; });
}


export async function voidOrderItem(repo:CorrectionRepository,input:{orderId:string;orderItemId:string;quantity:number;actorUserId:string;approvedByUserId?:string;reason:string}){
  if(!input.reason.trim()) throw new Error("VOID_REASON_REQUIRED");
  if(!repo.findOrderItem||!repo.listVoidedQuantity||!repo.createItemVoid) throw new Error("ITEM_VOID_REPOSITORY_NOT_CONFIGURED");
  return repo.transaction(async tx=>{
    const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND");
    const item=await tx.findOrderItem!(input.orderItemId); if(!item||item.orderId!==order.id) throw new Error("ORDER_ITEM_NOT_FOUND");
    const alreadyVoided=await tx.listVoidedQuantity!(item.id);
    assertItemVoidAllowed({operationalStatus:order.operationalStatus,financialStatus:order.financialStatus,soldQuantity:item.quantity,alreadyVoidedQuantity:alreadyVoided,requestedQuantity:input.quantity});
    const allocation=calculateItemRefund({soldQuantity:item.quantity,alreadyRefundedQuantity:alreadyVoided,requestedQuantity:input.quantity,lineGross:item.lineGross,lineDiscount:item.lineDiscount,lineTax:item.lineTax,lineTotal:item.lineTotal});
    const row=await tx.createItemVoid!({orderItemId:item.id,quantity:input.quantity,amount:allocation.total,reason:input.reason,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId});
    if(!tx.recalculateOpenOrderTotals) throw new Error("ORDER_RECALCULATION_NOT_CONFIGURED"); await tx.recalculateOpenOrderTotals(order.id);
    await tx.audit({action:"ITEM_VOIDED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason,metadata:{orderItemId:item.id,quantity:input.quantity,amount:allocation.total}});
    return {orderId:order.id,orderItemVoidId:row.id,orderItemId:item.id,quantity:input.quantity,amount:allocation.total};
  });
}

export async function refundOrderItems(repo:CorrectionRepository,input:{orderId:string;items:readonly {orderItemId:string;quantity:number}[];tender:Tender;actorUserId:string;approvedByUserId?:string;reason:string;idempotencyKey:string}){
  if(!input.reason.trim()) throw new Error("REFUND_REASON_REQUIRED"); if(!input.idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED"); if(input.items.length===0) throw new Error("REFUND_ITEMS_REQUIRED");
  if(!repo.findOrderItem||!repo.listRefundedQuantity||!repo.createRefundAllocation) throw new Error("ITEM_REFUND_REPOSITORY_NOT_CONFIGURED");
  const fingerprint=fp({op:"item-refund",...input,approvedByUserId:input.approvedByUserId??null});
  return repo.transaction(async tx=>{
    const existing=await tx.findIdempotency(input.idempotencyKey); if(existing){assertIdempotencyReuse(existing.fingerprint,fingerprint);return existing.result;}
    const order=await tx.lockOrder(input.orderId); if(!order) throw new Error("ORDER_NOT_FOUND");
    const allocations=[] as {orderItemId:string;quantity:number;gross:number;discount:number;tax:number;total:number}[];
    const seen=new Set<string>();
    for(const requested of input.items){
      if(seen.has(requested.orderItemId)) throw new Error("DUPLICATE_REFUND_ITEM"); seen.add(requested.orderItemId);
      const item=await tx.findOrderItem!(requested.orderItemId); if(!item||item.orderId!==order.id) throw new Error("ORDER_ITEM_NOT_FOUND");
      const already=await tx.listRefundedQuantity!(item.id); const a=calculateItemRefund({soldQuantity:item.quantity,alreadyRefundedQuantity:already,requestedQuantity:requested.quantity,lineGross:item.lineGross,lineDiscount:item.lineDiscount,lineTax:item.lineTax,lineTotal:item.lineTotal}); allocations.push({orderItemId:item.id,...a});
    }
    const amount=allocations.reduce((s,a)=>s+a.total,0); const ledger=await tx.listLedger(order.id); const paid=ledger.filter(x=>x.type==="PAYMENT").reduce((s,x)=>s+x.amount,0); const refunded=ledger.filter(x=>x.type==="REFUND").reduce((s,x)=>s+x.amount,0); const reversed=ledger.filter(x=>x.type==="REVERSAL").reduce((s,x)=>s+x.amount,0); const remaining=remainingRefundableAmount({paid,refunded,reversed}); assertRefundAmount(remaining,amount);
    const refund=await tx.createRefund({orderId:order.id,amount,reason:input.reason,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,idempotencyKey:input.idempotencyKey});
    for(const a of allocations) await tx.createRefundAllocation!({refundId:refund.id,orderItemId:a.orderItemId,quantity:a.quantity,grossAmount:a.gross,discountAmount:a.discount,taxAmount:a.tax,totalAmount:a.total});
    const row=await tx.createLedger({orderId:order.id,type:"REFUND",tender:input.tender,amount,performedByUserId:input.actorUserId,approvedByUserId:input.approvedByUserId,reason:input.reason,idempotencyKey:`${input.idempotencyKey}:ledger`,refundId:refund.id}); const state=deriveRefundedState(paid-reversed,refunded+amount); await tx.setOrderFinancialStatus(order.id,state);
    const result={refundId:refund.id,ledgerTransactionId:row.id,amount,allocations,financialStatus:state,remainingRefundable:remaining-amount}; await tx.audit({action:"REFUND_CREATED",entityId:order.id,actorUserId:input.actorUserId,approverUserId:input.approvedByUserId,reason:input.reason,metadata:{refundId:refund.id,amount,tender:input.tender,itemCount:allocations.length}}); await tx.createIdempotency({key:input.idempotencyKey,fingerprint,result}); return result;
  });
}
