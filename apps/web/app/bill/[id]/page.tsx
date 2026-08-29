import { db, orders, eq } from "@swift-till/db";
import { formatPaisa } from "@/lib/money";
import { BRAND_NAME, LOGO_MARK } from "@/lib/brand";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: { with: { modifiers: true } }, payments: true, table: true },
  });
  const company = await db.query.companies.findFirst();

  if (!order) {
    return <div className="p-10 text-center text-muted">Order not found.</div>;
  }

  const paid = (order.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const logo = company?.logoUrl || LOGO_MARK;
  const gstEnabled = company?.gstEnabled;
  const gstRate = company?.gstRate ?? 0;

  return (
    <div className="bill-page bg-panel-2 flex justify-center p-4 print:p-0 print:bg-white">
      <div className="bill-sheet w-full max-w-[320px] bg-white rounded-xl shadow p-5 print:shadow-none print:rounded-none">
        <div className="text-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={company?.name || BRAND_NAME}
            className="h-14 mx-auto object-contain"
          />
          <div className="font-bold text-lg mt-1">
            {company?.name || BRAND_NAME}
          </div>
          {company?.address ? (
            <div className="text-xs text-muted">{company.address}</div>
          ) : null}
          {company?.tagline ? (
            <div className="text-[11px] text-muted italic">{company.tagline}</div>
          ) : null}
        </div>

        <div className="border-t border-dashed border-line my-2" />
        <div className="text-xs flex justify-between text-muted">
          <span>
            {order.type}
            {order.table ? ` · T${order.table.number}` : ""}
          </span>
          <span>#{order.number}</span>
        </div>
        <div className="text-xs text-muted">
          {new Date(order.createdAt).toLocaleString()}
        </div>
        <div className="border-t border-dashed border-line my-2" />

        <div className="space-y-1.5 text-sm">
          {order.items.map((it) => (
            <div key={it.id}>
              <div className="flex justify-between">
                <span className="flex-1">
                  <span className="font-medium">{it.quantity}×</span> {it.name}
                </span>
                <span>{formatPaisa(it.unitPrice * it.quantity, "PKR")}</span>
              </div>
              {it.modifiers.length ? (
                <div className="text-[11px] text-muted pl-5">
                  {it.modifiers.map((m) => m.name).join(", ")}
                </div>
              ) : null}
              {it.notes ? (
                <div className="text-[11px] text-muted pl-5">“{it.notes}”</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-line my-2" />
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatPaisa(order.subtotal, "PKR")}</span>
          </div>
          {gstEnabled ? (
            <div className="flex justify-between text-muted">
              <span>GST {gstRate}%</span>
              <span>{formatPaisa(order.tax, "PKR")}</span>
            </div>
          ) : null}
          {order.discountPaisa > 0 ? (
            <div className="flex justify-between text-danger">
              <span>Discount</span>
              <span>-{formatPaisa(order.discountPaisa, "PKR")}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total</span>
            <span>{formatPaisa(order.total, "PKR")}</span>
          </div>
          {paid > 0 ? (
            <div className="flex justify-between text-muted">
              <span>Paid</span>
              <span>{formatPaisa(paid, "PKR")}</span>
            </div>
          ) : null}
          {paid > 0 && paid < order.total ? (
            <div className="flex justify-between font-semibold">
              <span>Balance</span>
              <span>{formatPaisa(order.total - paid, "PKR")}</span>
            </div>
          ) : null}
          {paid >= order.total && order.status === "BILLED" ? (
            <div className="text-center text-success font-semibold text-sm pt-1">
              PAID
            </div>
          ) : (
            <div className="text-center text-muted text-xs pt-1">
              UNPAID — please settle at counter
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-line my-2" />
        <div className="text-center text-[11px] text-muted">
          Powered by {BRAND_NAME} POS
        </div>

        <PrintButton />
      </div>
    </div>
  );
}
