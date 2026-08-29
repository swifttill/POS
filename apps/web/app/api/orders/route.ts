import { NextResponse } from "next/server";
import { db, orders, orderItems, orderItemModifiers, payments, menuItems, companies, eq, inArray, desc, sql } from "@swift-till/db";
import { gstAmount } from "@/lib/money";
import { requirePermission } from "@/lib/auth";
import type { Station } from "@/lib/types";

// Recent / pending orders (for the FOH Orders panel: edit / pay / void).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const orderList = await db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      limit: statusFilter === "OPEN" ? 200 : 50,
      ...(statusFilter ? { where: eq(orders.status, statusFilter) } : {}),
      with: {
        table: true,
        items: true,
        payments: true,
      },
    });
    return NextResponse.json({
      orders: orderList.map((o) => {
        const paid = o.payments.reduce((s, p) => s + p.amount, 0);
        return {
          id: o.id,
          number: o.number,
          type: o.type,
          status: o.status,
          subtotal: o.subtotal,
          tax: o.tax,
          total: o.total,
          discountPaisa: o.discountPaisa,
          paid,
          createdAt: o.createdAt,
          tableNumber: o.table?.number ?? null,
          tableName: o.table?.name ?? null,
          itemCount: o.items.length,
          editable: o.status === "OPEN" || o.status === "BILLED",
        };
      }),
    });
  } catch (err) {
    console.error("GET /api/orders failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

interface IncomingModifier {
  name: string;
  priceDelta: number;
}
interface IncomingItem {
  menuItemId?: string;
  name?: string;
  unitPrice?: number;
  station?: "BAR" | "GRILL" | "FRY" | "MAIN" | "DESSERT" | "EXPO";
  quantity: number;
  notes?: string | null;
  seat?: number | null;
  modifiers?: IncomingModifier[];
}
interface IncomingPayment {
  tender: "CASH" | "CARD" | "ONLINE";
  amount: number;
}
interface IncomingOrder {
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  pax?: number | null;
  shiftId?: string | null;
  waiterName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: IncomingItem[];
  payments: IncomingPayment[];
  discountPaisa?: number;
  discountReason?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IncomingOrder;

    if (!body.items?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const discountPaisa = Math.max(0, Math.floor(body.discountPaisa ?? 0));
    // Discounts require the "discount" permission (enforced server-side).
    let discountBy: string | null = null;
    if (discountPaisa > 0) {
      const manager = await requirePermission("discount");
      if (!manager) {
        return NextResponse.json(
          { error: "Permission required to apply discounts" },
          { status: 401 }
        );
      }
      discountBy = manager.name;
    }

    // Recompute from authoritative DB prices (prevents till tampering).
    const itemIds = body.items
      .map((i) => i.menuItemId)
      .filter((id): id is string => Boolean(id));
    const dbItems = await db.query.menuItems.findMany({
      where: inArray(menuItems.id, itemIds),
    });
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, "singleton"),
    });
    const gstRate = company?.gstEnabled ? company?.gstRate ?? 0 : 0;

    let subtotal = 0;
    const orderItemSpecs = body.items.map((line) => {
      const dbItem = line.menuItemId ? itemMap.get(line.menuItemId) : undefined;
      let name: string;
      let unitPrice: number;
      let station: Station;
      if (dbItem) {
        name = dbItem.name;
        unitPrice = dbItem.price;
        station = dbItem.printerStation as Station;
      } else {
        // Deal line (no backing MenuItem row) — trust provided name/price.
        if (!line.name || line.unitPrice == null) {
          throw new Error("Deal line is missing name or price");
        }
        name = line.name;
        unitPrice = line.unitPrice;
        station = (line.station ?? "MAIN") as Station;
      }
      const mods = line.modifiers ?? [];
      const modTotal = mods.reduce((s, m) => s + m.priceDelta, 0);
      const lineUnit = unitPrice + modTotal;
      const lineTotal = lineUnit * line.quantity;
      subtotal += lineTotal;

      return {
        row: {
          menuItemId: dbItem ? dbItem.id : null,
          name,
          unitPrice,
          quantity: line.quantity,
          seat: line.seat ?? null,
          notes: line.notes ?? null,
          station,
        },
        modifiers: mods.map((m) => ({
          name: m.name,
          priceDelta: m.priceDelta,
        })),
      };
    });

    // Apply the (manager-approved) discount to the subtotal, then tax the
    // discounted amount.
    const discountedSubtotal = Math.max(0, subtotal - discountPaisa);
    const taxAfter = gstAmount(discountedSubtotal, gstRate);
    const total = discountedSubtotal + taxAfter;

    const paidTotal = (body.payments ?? []).reduce(
      (s, p) => s + p.amount,
      0
    );
    // No payments => the order is "sent to kitchen" and parked as OPEN
    // (pending / held). With full payment it is BILLED immediately.
    const hasPayments = (body.payments?.length ?? 0) > 0;
    if (hasPayments && paidTotal !== total) {
      return NextResponse.json(
        { error: "Tendered amount does not match total", paidTotal, total },
        { status: 400 }
      );
    }
    const finalStatus = hasPayments ? "BILLED" : "OPEN";

    const [maxRow] = await db
      .select({ m: sql<number>`max(${orders.number})` })
      .from(orders);
    const nextNumber = (Number(maxRow?.m ?? 0)) + 1;

    const [order] = await db
      .insert(orders)
      .values({
        number: nextNumber,
        type: body.type,
        tableId: body.tableId ?? null,
        pax: body.pax ?? null,
        shiftId: body.shiftId ?? null,
        waiterName: body.waiterName ?? null,
        customerName: body.customerName ?? null,
        customerPhone: body.customerPhone ?? null,
        customerAddress: body.customerAddress ?? null,
        subtotal: discountedSubtotal,
        tax: taxAfter,
        total,
        discountPaisa,
        discountReason: discountPaisa > 0 ? (body.discountReason ?? null) : null,
        discountBy,
        status: finalStatus,
        kotPrinted: true,
        billedAt: finalStatus === "BILLED" ? new Date() : null,
      })
      .returning();

    const insertedItems = await db
      .insert(orderItems)
      .values(orderItemSpecs.map((s) => ({ ...s.row, orderId: order.id })))
      .returning();

    for (let i = 0; i < insertedItems.length; i++) {
      const mods = orderItemSpecs[i].modifiers;
      if (mods.length) {
        await db
          .insert(orderItemModifiers)
          .values(
            mods.map((m) => ({
              orderItemId: insertedItems[i].id,
              name: m.name,
              priceDelta: m.priceDelta,
            }))
          );
      }
    }

    if (body.payments?.length) {
      await db
        .insert(payments)
        .values(
          body.payments.map((p) => ({
            orderId: order.id,
            tender: p.tender,
            amount: p.amount,
          }))
        );
    }

    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, order.id),
      with: {
        items: { with: { modifiers: true } },
        payments: true,
      },
    });

    return NextResponse.json({ order: fullOrder });
  } catch (err) {
    console.error("POST /api/orders failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    const reason = msg.includes("params:")
      ? msg.slice(msg.indexOf("params:") + 7).trim().slice(0, 400)
      : msg.slice(0, 400);
    return NextResponse.json(
      { error: "Failed to create order", detail: reason },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
