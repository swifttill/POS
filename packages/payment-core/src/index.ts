import { applyCashTender, validateNonCashTender, type MinorUnits } from "../../financial-core/src/index.ts";

export type Tender = "CASH" | "CARD" | "ONLINE";
export type PaymentLine = Readonly<{ tender: Tender; requestedAmount: MinorUnits; tenderedAmount?: MinorUnits; reference?: string }>;
export type AppliedPayment = Readonly<{ tender: Tender; appliedAmount: MinorUnits; tenderedAmount: MinorUnits; changeGiven: MinorUnits; reference?: string }>;
export type PaymentPlan = Readonly<{ payments: readonly AppliedPayment[]; totalApplied: MinorUnits; balanceDue: MinorUnits; status: "UNPAID"|"PARTIALLY_PAID"|"PAID" }>;
export class PaymentError extends Error { readonly code:string; constructor(code:string, message:string){super(message);this.code=code;this.name="PaymentError";} }
function money(v:number,n:string){ if(!Number.isSafeInteger(v)||v<0) throw new PaymentError("INVALID_PAYMENT_AMOUNT",`${n} must be non-negative minor units`); }
export function applyPaymentPlan(total: MinorUnits, alreadyPaid: MinorUnits, lines: readonly PaymentLine[]): PaymentPlan {
  money(total,"total"); money(alreadyPaid,"alreadyPaid"); if(alreadyPaid>total) throw new PaymentError("PAID_EXCEEDS_TOTAL","already paid exceeds total");
  let balance=total-alreadyPaid; const payments:AppliedPayment[]=[];
  for(const line of lines){
    money(line.requestedAmount,"requestedAmount"); if(line.requestedAmount===0) throw new PaymentError("ZERO_PAYMENT","payment must be greater than zero");
    if(balance===0) throw new PaymentError("ORDER_ALREADY_PAID","order has no balance due");
    if(line.tender==="CASH"){
      const tendered=line.tenderedAmount ?? line.requestedAmount; money(tendered,"tenderedAmount");
      if(tendered < line.requestedAmount) throw new PaymentError("CASH_TENDER_MISMATCH","cash tendered cannot be below requested cash amount");
      const desired=Math.min(line.requestedAmount,balance); const cash=applyCashTender(desired,tendered);
      payments.push({tender:"CASH",...cash,reference:line.reference}); balance-=cash.appliedAmount;
    } else {
      const amount=validateNonCashTender(balance,line.requestedAmount);
      payments.push({tender:line.tender,appliedAmount:amount,tenderedAmount:amount,changeGiven:0,reference:line.reference}); balance-=amount;
    }
  }
  const totalApplied=payments.reduce((s,p)=>s+p.appliedAmount,0);
  return {payments,totalApplied,balanceDue:balance,status: balance===0?"PAID":alreadyPaid+totalApplied>0?"PARTIALLY_PAID":"UNPAID"};
}
export function paymentFingerprint(input:{orderId:string; actorUserId:string; lines:readonly PaymentLine[]}):string{
  return JSON.stringify({orderId:input.orderId,actorUserId:input.actorUserId,lines:input.lines.map(l=>({tender:l.tender,requestedAmount:l.requestedAmount,tenderedAmount:l.tenderedAmount??null,reference:l.reference??null}))});
}
export function assertIdempotencyReuse(existingFingerprint:string,incomingFingerprint:string){ if(existingFingerprint!==incomingFingerprint) throw new PaymentError("IDEMPOTENCY_KEY_REUSED","idempotency key was already used for a different payment request"); }
