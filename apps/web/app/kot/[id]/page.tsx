import { db, orders, companies, eq } from "@swift-till/db";
import { BRAND_NAME } from "@/lib/brand";
import { AutoPrint } from "@/components/AutoPrint";

export const dynamic = "force-dynamic";

export default async function KOTPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: { with: { modifiers: true } }, table: true },
  });
  const company = await db.query.companies.findFirst();

  if (!order) {
    return <div className="p-10 text-center text-muted">Order not found.</div>;
  }

  const items = order.items;
  const stations = Array.from(
    new Set(items.map((i) => (i.station || "KITCHEN").toUpperCase()))
  );

  return (
    <div className="kot-page bg-panel-2 flex justify-center p-4 print:p-0 print:bg-white">
      <div className="kot-sheet w-full max-w-[300px] bg-white rounded-xl shadow p-4 print:shadow-none print:rounded-none">
        <div className="text-center mb-2">
          <div className="font-bold tracking-wide">{company?.name || BRAND_NAME}</div>
          <div className="text-xs text-muted uppercase">Kitchen Order Ticket</div>
        </div>
        <div className="border-t border-dashed border-line my-2" />
        <div className="text-xs flex justify-between">
          <span>
            {order.type}
            {order.table ? ` · T${order.table.number}` : ""}
          </span>
          <span>#{order.number}</span>
        </div>
        <div className="text-xs text-muted">
          {new Date(order.createdAt).toLocaleTimeString()}
          {order.waiterName ? ` · ${order.waiterName}` : ""}
        </div>
        <div className="border-t border-dashed border-line my-2" />

        <div className="space-y-3">
          {stations.map((st) => (
            <div key={st}>
              <div className="text-[11px] font-bold uppercase text-brand bg-brand-soft rounded px-1.5 py-0.5 inline-block">
                {st}
              </div>
              <div className="mt-1 space-y-1">
                {items
                  .filter((i) => (i.station || "KITCHEN").toUpperCase() === st)
                  .map((it) => (
                    <div key={it.id}>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex-1">
                          <span className="text-base">{it.quantity}×</span> {it.name}
                        </span>
                      </div>
                      {it.modifiers.length ? (
                        <div className="text-[11px] text-muted pl-5">
                          {it.modifiers.map((m) => m.name).join(", ")}
                        </div>
                      ) : null}
                      {it.notes ? (
                        <div className="text-[11px] italic text-muted pl-5">
                          “{it.notes}”
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-line my-2" />
        <div className="text-center text-[10px] text-muted">
          {BRAND_NAME} POS · KOT
        </div>

        <AutoPrint />
      </div>
    </div>
  );
}
