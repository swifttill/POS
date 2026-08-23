import { EscPos } from "./escpos";

function formatPaisa(paisa: number, currency = "PKR"): string {
  const rupees = Math.floor(paisa / 100);
  const part = (paisa % 100).toString().padStart(2, "0");
  return `${currency === "PKR" ? "Rs " : ""}${rupees}.${part}`;
}

interface BillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  seat: number | null;
}
interface BillPayment {
  tender: string;
  amount: number;
}

// Customer bill (no images, names only — matches the receipt rule).
export function buildBill(
  companyName: string,
  order: {
    id: string;
    type: string;
    tableId?: string | null;
    waiterName?: string | null;
    pax?: number | null;
    createdAt: Date;
    subtotal: number;
    tax: number;
    total: number;
  },
  items: BillItem[],
  payments: BillPayment[],
  currency = "PKR"
): Buffer {
  const p = new EscPos().init();
  p.align("center").large(true).bold(true).text(companyName).large(false).bold(false);
  p.line("*** CUSTOMER BILL ***");
  p.hr();
  p.align("left");
  p.line(`#${order.id.slice(0, 8)}  ${order.type}`);
  if (order.tableId) p.line(`Table: ${order.tableId}`);
  if (order.waiterName) p.line(`Waiter: ${order.waiterName}`);
  if (order.pax) p.line(`Pax: ${order.pax}`);
  p.line(new Date(order.createdAt).toLocaleString());
  p.hr();
  for (const it of items) {
    p.text(`${it.quantity}x ${it.name}${it.seat ? ` (S${it.seat})` : ""}`);
    p.line(`   ${formatPaisa(it.unitPrice * it.quantity, currency)}`);
  }
  p.hr();
  p.line(`Subtotal: ${formatPaisa(order.subtotal, currency)}`);
  if (order.tax) p.line(`Tax:      ${formatPaisa(order.tax, currency)}`);
  p.bold(true).text(`TOTAL:     ${formatPaisa(order.total, currency)}`).bold(false);
  if (payments.length) {
    p.hr();
    for (const pay of payments) {
      p.line(`${pay.tender}: ${formatPaisa(pay.amount, currency)}`);
    }
  }
  p.feed(1).align("center").text("Thank you!");
  p.feed(3).cut();
  return p.toBuffer();
}
