import { db, orders, orderItems, companies, eq, asc } from "@swift-till/db";
import { formatPaisa } from "@/lib/money";
import { publicAssetIfExists } from "@/lib/brand-server";
import type { Station } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATION_LABEL: Record<Station, string> = {
  BAR: "BAR",
  GRILL: "GRILL",
  FRY: "FRY",
  MAIN: "MAIN",
  DESSERT: "DESSERT",
  EXPO: "EXPO",
};

export default async function PrintOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: { modifiers: true },
        orderBy: [asc(orderItems.seat), asc(orderItems.name)],
      },
      payments: true,
      table: true,
    },
  });

  if (!order) {
    return (
      <main style={{ fontFamily: "monospace", padding: 24 }}>Order not found.</main>
    );
  }

  const company = await db.query.companies.findFirst({ where: eq(companies.id, "singleton") });
  const logoPath =
    company?.logoUrl ?? publicAssetIfExists("/assets/logo.svg");

  // Group by station for routed kitchen tickets.
  const byStation = new Map<Station, typeof order.items>();
  for (const it of order.items) {
    const key = it.station as Station;
    if (!byStation.has(key)) byStation.set(key, []);
    byStation.get(key)!.push(it);
  }

  return (
    <div style={{ fontFamily: "monospace", color: "#000", background: "#fff", padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <style>{`@media print { body { margin: 0 } .noprint { display: none } }`}</style>
      <button
        className="noprint"
        onClick={() => window.print()}
        style={{ marginBottom: 16, padding: "8px 16px", cursor: "pointer" }}
      >
        Print this ticket
      </button>

      <h1 style={{ textAlign: "center", fontSize: 20, margin: 0 }}>
        {company?.name ?? "SwiftTill"}
      </h1>
      {logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoPath}
          alt="logo"
          style={{ display: "block", margin: "8px auto", maxHeight: 64 }}
        />
      ) : null}
      <div style={{ textAlign: "center", fontSize: 12 }}>
        {company?.address ?? ""}
      </div>
      <hr />
      <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
        <span>
          {order.type}
          {order.table ? ` · T${order.table.number}` : ""}
        </span>
        <span>{new Date(order.createdAt).toLocaleString()}</span>
      </div>
      {order.waiterName ? <div style={{ fontSize: 12 }}>Waiter: {order.waiterName}</div> : null}
      {order.pax ? <div style={{ fontSize: 12 }}>Pax: {order.pax}</div> : null}
      {order.customerName ? <div style={{ fontSize: 12 }}>Customer: {order.customerName}</div> : null}
      <hr />

      <h2 style={{ fontSize: 14 }}>CUSTOMER BILL</h2>
      {order.items.map((it, i) => (
        <div key={i} style={{ fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {it.quantity}× {it.name}
              {it.seat ? ` (S${it.seat})` : ""}
            </span>
            <span>{formatPaisa(it.unitPrice * it.quantity, company?.currency ?? "PKR")}</span>
          </div>
          {it.notes ? <div style={{ fontSize: 11, paddingLeft: 12 }}>“{it.notes}”</div> : null}
        </div>
      ))}
      <hr />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>Subtotal</span>
        <span>{formatPaisa(order.subtotal, company?.currency ?? "PKR")}</span>
      </div>
      {order.tax ? (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span>Tax</span>
          <span>{formatPaisa(order.tax, company?.currency ?? "PKR")}</span>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: "bold" }}>
        <span>TOTAL</span>
        <span>{formatPaisa(order.total, company?.currency ?? "PKR")}</span>
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {order.payments.map((p) => `${p.tender}: ${formatPaisa(p.amount, company?.currency ?? "PKR")}`).join("  ·  ")}
      </div>

      {/* Routed kitchen tickets (one per station) */}
      <hr />
      <h2 style={{ fontSize: 14 }}>KITCHEN TICKETS (ROUTED)</h2>
      {Array.from(byStation.entries()).map(([station, items]) => (
        <div key={station} style={{ border: "1px dashed #000", padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: "bold", textAlign: "center" }}>
            *** {STATION_LABEL[station]} ***
          </div>
          <div style={{ fontSize: 11 }}>
            {order.type}
            {order.table ? ` T${order.table.number}` : ""} ·{" "}
            {new Date(order.createdAt).toLocaleTimeString()}
          </div>
          {items.map((it, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {it.quantity}× {it.name}
                  {it.seat ? ` (S${it.seat})` : ""}
                </span>
              </div>
              {it.modifiers.length ? (
                <div style={{ fontSize: 11, paddingLeft: 12 }}>
                  + {it.modifiers.map((m) => m.name).join(", ")}
                </div>
              ) : null}
              {it.notes ? <div style={{ fontSize: 11, paddingLeft: 12 }}>“{it.notes}”</div> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const runtime = "nodejs";
