import type { MinorUnits } from "../../financial-core/src/index.ts";

export type Tender = "CASH" | "CARD" | "ONLINE";
export type FinancialState = "UNPAID"|"PARTIALLY_PAID"|"PAID"|"PARTIALLY_REFUNDED"|"FULLY_REFUNDED";

export class CorrectionError extends Error {
  readonly code: string;
  constructor(code:string,message:string){ super(message); this.code=code; this.name="CorrectionError"; }
}
function money(value:number, field:string){ if(!Number.isSafeInteger(value)||value<0) throw new CorrectionError("INVALID_AMOUNT",`${field} must be non-negative minor units`); }
function qty(value:number, field:string){ if(!Number.isInteger(value)||value<0) throw new CorrectionError("INVALID_QUANTITY",`${field} must be a non-negative integer`); }

export function remainingRefundableAmount(input:{paid:MinorUnits; refunded:MinorUnits; reversed?:MinorUnits}):MinorUnits{
  money(input.paid,"paid"); money(input.refunded,"refunded"); money(input.reversed??0,"reversed");
  const used=input.refunded+(input.reversed??0);
  if(used>input.paid) throw new CorrectionError("LEDGER_INCONSISTENT","refunds/reversals exceed paid amount");
  return input.paid-used;
}

export function assertRefundAmount(remaining:MinorUnits, requested:MinorUnits){
  money(remaining,"remaining"); money(requested,"requested");
  if(requested<=0) throw new CorrectionError("REFUND_AMOUNT_REQUIRED","refund must be greater than zero");
  if(requested>remaining) throw new CorrectionError("REFUND_LIMIT_EXCEEDED","refund exceeds remaining refundable amount");
}

/** Deterministically splits a historical line amount by unit so all units sum back exactly. */
export function splitAmountByUnits(amount:MinorUnits, quantity:number):readonly MinorUnits[]{
  money(amount,"amount"); qty(quantity,"quantity"); if(quantity<1) throw new CorrectionError("INVALID_QUANTITY","quantity must be at least one");
  const base=Math.floor(amount/quantity), remainder=amount%quantity;
  return Array.from({length:quantity},(_,i)=>base+(i<remainder?1:0));
}

export function calculateItemRefund(input:{
  soldQuantity:number; alreadyRefundedQuantity:number; requestedQuantity:number;
  lineGross:MinorUnits; lineDiscount:MinorUnits; lineTax:MinorUnits; lineTotal:MinorUnits;
}):{quantity:number;gross:MinorUnits;discount:MinorUnits;tax:MinorUnits;total:MinorUnits}{
  qty(input.soldQuantity,"soldQuantity"); qty(input.alreadyRefundedQuantity,"alreadyRefundedQuantity"); qty(input.requestedQuantity,"requestedQuantity");
  if(input.soldQuantity<1||input.requestedQuantity<1) throw new CorrectionError("INVALID_QUANTITY","sold and requested quantity must be positive");
  if(input.alreadyRefundedQuantity+input.requestedQuantity>input.soldQuantity) throw new CorrectionError("REFUND_QUANTITY_EXCEEDED","requested quantity exceeds remaining refundable quantity");
  for(const [n,v] of Object.entries({lineGross:input.lineGross,lineDiscount:input.lineDiscount,lineTax:input.lineTax,lineTotal:input.lineTotal})) money(v,n);
  const start=input.alreadyRefundedQuantity, end=start+input.requestedQuantity;
  const sum=(arr:readonly number[])=>arr.slice(start,end).reduce((a,b)=>a+b,0);
  return {quantity:input.requestedQuantity,gross:sum(splitAmountByUnits(input.lineGross,input.soldQuantity)),discount:sum(splitAmountByUnits(input.lineDiscount,input.soldQuantity)),tax:sum(splitAmountByUnits(input.lineTax,input.soldQuantity)),total:sum(splitAmountByUnits(input.lineTotal,input.soldQuantity))};
}

export function assertOrderVoidAllowed(input:{operationalStatus:string;financialStatus:FinancialState}){
  if(input.operationalStatus!=="OPEN") throw new CorrectionError("VOID_REQUIRES_OPEN_ORDER","only an OPEN order can be voided");
  if(input.financialStatus!=="UNPAID") throw new CorrectionError("PAID_ORDER_REQUIRES_REFUND","paid/partially-paid orders require payment correction or refund, not order void");
}

export function assertItemVoidAllowed(input:{operationalStatus:string;financialStatus:FinancialState;soldQuantity:number;alreadyVoidedQuantity:number;requestedQuantity:number}){
  assertOrderVoidAllowed(input); qty(input.soldQuantity,"soldQuantity");qty(input.alreadyVoidedQuantity,"alreadyVoidedQuantity");qty(input.requestedQuantity,"requestedQuantity");
  if(input.requestedQuantity<1||input.alreadyVoidedQuantity+input.requestedQuantity>input.soldQuantity) throw new CorrectionError("VOID_QUANTITY_EXCEEDED","void quantity exceeds remaining item quantity");
}

export function assertPaymentCorrectionAllowed(input:{paymentAmount:MinorUnits;alreadyReversed:MinorUnits;alreadyRefunded:MinorUnits;newTender:Tender}){
  money(input.paymentAmount,"paymentAmount");money(input.alreadyReversed,"alreadyReversed");money(input.alreadyRefunded,"alreadyRefunded");
  if(input.paymentAmount<=0) throw new CorrectionError("INVALID_PAYMENT_AMOUNT","payment amount must be positive");
  if(input.alreadyReversed>0) throw new CorrectionError("PAYMENT_ALREADY_REVERSED","payment was already reversed/corrected");
  if(input.alreadyRefunded>0) throw new CorrectionError("REFUNDED_PAYMENT_CANNOT_BE_CORRECTED","a refunded payment cannot be tender-corrected");
  if(!["CASH","CARD","ONLINE"].includes(input.newTender)) throw new CorrectionError("INVALID_TENDER","unsupported replacement tender");
}

export function deriveRefundedState(totalPaid:MinorUnits,totalRefunded:MinorUnits):"PAID"|"PARTIALLY_REFUNDED"|"FULLY_REFUNDED"{
  money(totalPaid,"totalPaid");money(totalRefunded,"totalRefunded"); if(totalRefunded>totalPaid) throw new CorrectionError("LEDGER_INCONSISTENT","refund exceeds paid amount");
  return totalRefunded===0?"PAID":totalRefunded===totalPaid?"FULLY_REFUNDED":"PARTIALLY_REFUNDED";
}
