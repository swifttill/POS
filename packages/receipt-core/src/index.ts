export type ReceiptKind = "BILL" | "FINAL" | "PARTIAL_PAYMENT" | "DUPLICATE" | "REFUND";
export type PaperWidth = "MM80" | "MM58";
export type TenderName = "CASH" | "CARD" | "ONLINE";

export interface ReceiptLineSnapshot {
  name: string;
  variant?: string | null;
  modifiers?: string[];
  quantity: number;
  unitPrice: bigint;
  gross: bigint;
  discount: bigint;
  tax: bigint;
  total: bigint;
}
export interface TenderSnapshot { tender:TenderName; amount:bigint; tenderedAmount?:bigint|null; changeGiven?:bigint|null; reference?:string|null }
export interface ReceiptSnapshot {
  kind: ReceiptKind;
  receiptNumber: string;
  originalReceiptNumber?: string | null;
  orderId: string;
  orderNumber: bigint;
  businessDate: string;
  issuedAt: string;
  currencyCode: string;
  companyName: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  taxLabel: string;
  taxEnabled: boolean;
  orderType: "DINE_IN"|"TAKEAWAY"|"DELIVERY";
  tables?: string[];
  customerName?: string|null;
  customerPhone?: string|null;
  cashierName: string;
  lines: ReceiptLineSnapshot[];
  grossSubtotal: bigint;
  discountTotal: bigint;
  taxableSubtotal: bigint;
  taxTotal: bigint;
  total: bigint;
  payments: TenderSnapshot[];
  paid: bigint;
  balanceDue: bigint;
  refundTotal?: bigint;
  footer?: string|null;
}

export function sumAppliedPayments(payments:TenderSnapshot[]):bigint {
  return payments.reduce((n,p)=>n+p.amount,0n);
}
export function assertReceiptSnapshot(s:ReceiptSnapshot):void {
  if (!s.receiptNumber.trim() || !s.orderId.trim() || !s.companyName.trim() || !s.cashierName.trim()) throw new Error("RECEIPT_IDENTITY_REQUIRED");
  if (s.orderNumber <= 0n || s.total < 0n || s.grossSubtotal < 0n || s.discountTotal < 0n || s.taxTotal < 0n) throw new Error("RECEIPT_MONEY_INVALID");
  if (s.lines.some(l=>l.quantity<=0 || l.unitPrice<0n || l.gross<0n || l.discount<0n || l.tax<0n || l.total<0n)) throw new Error("RECEIPT_LINE_INVALID");
  const paid=sumAppliedPayments(s.payments);
  if (paid !== s.paid) throw new Error("RECEIPT_PAID_MISMATCH");
  const expectedBalance=s.total>paid?s.total-paid:0n;
  if (s.kind !== "REFUND" && s.balanceDue !== expectedBalance) throw new Error("RECEIPT_BALANCE_MISMATCH");
  for (const p of s.payments) {
    if (p.amount < 0n) throw new Error("RECEIPT_PAYMENT_INVALID");
    if (p.tender !== "CASH" && ((p.tenderedAmount??p.amount)!==p.amount || (p.changeGiven??0n)!==0n)) throw new Error("NON_CASH_CHANGE_INVALID");
    if (p.tender === "CASH" && (p.changeGiven??0n) < 0n) throw new Error("CASH_CHANGE_INVALID");
  }
  if (s.kind === "DUPLICATE" && !s.originalReceiptNumber) throw new Error("DUPLICATE_ORIGINAL_REQUIRED");
  if (s.kind === "REFUND" && (s.refundTotal??0n)<=0n) throw new Error("REFUND_TOTAL_REQUIRED");
}

export function formatMinor(amount:bigint,currencyCode:string):string {
  const neg=amount<0n; const a=neg?-amount:amount; const whole=a/100n; const frac=(a%100n).toString().padStart(2,"0");
  return `${neg?"-":""}${currencyCode} ${whole}.${frac}`;
}
function center(s:string,w:number){ if(s.length>=w)return s.slice(0,w); const l=Math.floor((w-s.length)/2); return " ".repeat(l)+s; }
function lr(l:string,r:string,w:number){ const room=Math.max(1,w-r.length); const left=l.length>room?l.slice(0,room):l; return left+" ".repeat(Math.max(1,w-left.length-r.length))+r; }
export function renderThermalText(s:ReceiptSnapshot,paper:PaperWidth="MM80"):string {
  assertReceiptSnapshot(s);
  const w=paper==="MM80"?42:30; const out:string[]=[];
  out.push(center(s.companyName,w)); if(s.address) out.push(center(s.address,w)); if(s.phone) out.push(center(s.phone,w));
  out.push("-".repeat(w));
  const title=s.kind==="DUPLICATE"?"DUPLICATE RECEIPT":s.kind==="REFUND"?"REFUND RECEIPT":s.kind==="PARTIAL_PAYMENT"?"PARTIAL PAYMENT":s.kind==="BILL"?"CUSTOMER BILL":"RECEIPT";
  out.push(center(title,w)); out.push(lr(`Order #${s.orderNumber}`,s.receiptNumber,w)); out.push(lr(s.orderType,s.businessDate,w));
  if(s.tables?.length) out.push(`Tables: ${s.tables.join(" + ")}`.slice(0,w));
  out.push(`Cashier: ${s.cashierName}`.slice(0,w)); out.push("-".repeat(w));
  for(const line of s.lines){ out.push(`${line.quantity} x ${line.name}`.slice(0,w)); if(line.variant) out.push(`  ${line.variant}`.slice(0,w)); for(const m of line.modifiers??[]) out.push(`  + ${m}`.slice(0,w)); out.push(lr("",formatMinor(line.total,s.currencyCode),w)); }
  out.push("-".repeat(w));
  out.push(lr("Subtotal",formatMinor(s.grossSubtotal,s.currencyCode),w));
  if(s.discountTotal) out.push(lr("Discount",`-${formatMinor(s.discountTotal,s.currencyCode)}`,w));
  if(s.taxEnabled) out.push(lr(s.taxLabel,formatMinor(s.taxTotal,s.currencyCode),w));
  out.push(lr("TOTAL",formatMinor(s.total,s.currencyCode),w));
  for(const p of s.payments){out.push(lr(p.tender,formatMinor(p.amount,s.currencyCode),w)); if(p.tender==="CASH" && (p.changeGiven??0n)>0n) out.push(lr("Change",formatMinor(p.changeGiven??0n,s.currencyCode),w));}
  if(s.kind==="REFUND") out.push(lr("REFUNDED",formatMinor(s.refundTotal??0n,s.currencyCode),w)); else out.push(lr("Balance",formatMinor(s.balanceDue,s.currencyCode),w));
  if(s.kind==="DUPLICATE") out.push(center(`Copy of ${s.originalReceiptNumber}`,w));
  if(s.footer){out.push("-".repeat(w));out.push(center(s.footer,w));}
  return out.join("\n");
}

export function duplicateFrom(original:ReceiptSnapshot,newReceiptNumber:string,issuedAt:string):ReceiptSnapshot {
  if(original.kind==="REFUND") throw new Error("REFUND_DUPLICATE_USE_REFUND_COPY_FLOW");
  const copy={...original,kind:"DUPLICATE" as const,receiptNumber:newReceiptNumber,originalReceiptNumber:original.originalReceiptNumber??original.receiptNumber,issuedAt};
  assertReceiptSnapshot(copy); return copy;
}
