import { NextResponse } from "next/server";
import {
  db,
  orders,
  orderItems,
  orderItemModifiers,
  payments,
  menuItems,
  companies,
  eq,
  inArray,
  asc,
} from "@swift-till/db";
import { gstAmount } from "@/lib/money";
import { requirePermission } from "@/lib/auth";
import type { Station } from "@/lib/types";

interface IncomingModifier {
  name: string;
  priceDelta: number;
}
interface IncomingItem {
  menuItemId?: string;
  name?: string;
  unitPrice?: number;
  station?: Station;
  quantity: number;
  notes?: string | null;
  seat?: number | null;
  modifiers?: IncomingModifier[];
}
interface IncomingPayment {
  tender: "CASH" | "CARD" | "ONLINE";
  amount: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: { modifiers: true },
          orderBy: asc(orderItems.seat),
        },
        payments: true,
        table: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Group ticket lines by printer station for routed ESC/POS printing.
    const byStation = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const key = item.station;
      if (!byStation.has(key)) byStation.set(key, []);
      byStation.get(key)!.push(item);
    }

    return NextResponse.json({
      order,
      routing: Array.from(byStation.entries()).map(([station, items]) => ({
        station,
        items,
      })),
    });
  } catch (err) {
    console.error("GET /api/orders/[id] failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      addItems?: IncomingItem[];
      updateItems?: { id: string; quantity?: number; notes?: string | null }[];
      removeItemIds?: string[];
      discountPaisa?: number;
      discountReason?: string | null;
      payments?: IncomingPayment[];
      status?: string;
    };

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { with: { modifiers: true } },
        payments: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (order.status === "VOIDED" || order.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Order is closed and cannot be edited" },
        { status: 400 }
      );
    }

    // --- Manager-approved discount (whole order) ---
    let discountPaisa = order.discountPaisa;
    let discountBy = order.discountBy;
    let discountReason = order.discountReason;
    if (body.discountPaisa != null) {
      const manager = await requirePermission("discount");
      if (!manager) {
        return NextResponse.json(
          { error: "Permission required to apply discounts" },
          { status: 401 }
        );
      }
      discountPaisa = Math.max(0, Math.floor(body.discountPaisa));
      discountBy = manager.name;
      discountReason = body.discountReason ?? null;
    }

    // --- Add new items (recompute from authoritative DB prices) ---
    if (body.addItems?.length) {
      const itemIds = body.addItems
        .map((i) => i.menuItemId)
        .filter((x): x is string => Boolean(x));
      const dbItems = await db.query.menuItems.findMany({
        where: inArray(menuItems.id, itemIds),
      });
      const itemMap = new Map(dbItems.map((i) => [i.id, i]));

      const specs = body.addItems.map((line) => {
        const dbItem = line.menuItemId ? itemMap.get(line.menuItemId) : undefined;
        let name: string;
        let unitPrice: number;
        let station: Station;
        if (dbItem) {
          name = dbItem.name;
          unitPrice = dbItem.price;
          station = dbItem.printerStation as Station;
        } else {
          if (!line.name || line.unitPrice == null) {
            throw new Error("Deal line is missing name or price");
          }
          name = line.name;
          unitPrice = line.unitPrice;
          station = (line.station ?? "MAIN") as Station;
        }
        return {
          row: {
            orderId: id,
            menuItemId: dbItem ? dbItem.id : null,
            name,
            unitPrice,
            quantity: line.quantity,
            seat: line.seat ?? null,
            notes: line.notes ?? null,
            station,
          },
          modifiers: (line.modifiers ?? []).map((m) => ({
            name: m.name,
            priceDelta: m.priceDelta,
          })),
        };
      });

      const inserted = await db
        .insert(orderItems)
        .values(specs.map((s) => s.row))
        .returning();
      for (let i = 0; i < inserted.length; i++) {
        const mods = specs[i].modifiers;
        if (mods.length) {
          await db.insert(orderItemModifiers).values(
            mods.map((m) => ({
              orderItemId: inserted[i].id,
              name: m.name,
              priceDelta: m.priceDelta,
            }))
          );
        }
      }
      // New items mean the kitchen needs a fresh KOT.
      await db.update(orders).set({ kotPrinted: false }).where(eq(orders.id, id));
    }

    // --- Update quantities / notes on existing lines ---
    if (body.updateItems?.length) {
      for (const u of body.updateItems) {
        const patch: { quantity?: number; notes?: string | null } = {};
        if (u.quantity != null) patch.quantity = Math.max(0, u.quantity);
        if (u.notes !== undefined) patch.notes = u.notes;
        if (Object.keys(patch).length) {
          await db
            .update(orderItems)
            .set(patch)
            .where(eq(orderItems.id, u.id));
        }
      }
    }

    // --- Remove lines ---
    if (body.removeItemIds?.length) {
      await db
        .delete(orderItemModifiers)
        .where(inArray(orderItemModifiers.orderItemId, body.removeItemIds));
      await db
        .delete(orderItems)
        .where(inArray(orderItems.id, body.removeItemIds));
    }

    // --- Recompute totals from current lines ---
    const currentItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, id),
      with: { modifiers: true },
    });
    let subtotal = 0;
    for (const it of currentItems) {
      const modTotal = it.modifiers.reduce((s, m) => s + m.priceDelta, 0);
      subtotal += (it.unitPrice + modTotal) * it.quantity;
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, "singleton"),
    });
    const gstRate = company?.gstEnabled ? company?.gstRate ?? 0 : 0;
    const discountedSubtotal = Math.max(0, subtotal - discountPaisa);
    const tax = gstAmount(discountedSubtotal, gstRate);
    const total = discountedSubtotal + tax;

    // --- Record payments (pay / partial) ---
    if (body.payments?.length) {
      await db.insert(payments).values(
        body.payments.map((p) => ({
          orderId: id,
          tender: p.tender,
          amount: p.amount,
        }))
      );
    }
    const allPayments = await db.query.payments.findMany({
      where: eq(payments.orderId, id),
    });
    const paid = allPayments.reduce((s, p) => s + p.amount, 0);

    // --- Resolve final status ---
    let status = order.status;
    if (body.status) {
      status = body.status;
    } else if (paid >= total && total > 0) {
      status = "BILLED";
    } else if (paid > 0 && paid < total) {
      status = "OPEN";
    }

    const billedAt =
      status === "BILLED" && !order.billedAt ? new Date() : order.billedAt;
    const closedAt =
      status === "CLOSED" && !order.closedAt ? new Date() : order.closedAt;

    await db
      .update(orders)
      .set({
        subtotal: discountedSubtotal,
        tax,
        total,
        discountPaisa,
        discountBy,
        discountReason,
        status,
        billedAt,
        closedAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { with: { modifiers: true } },
        payments: true,
        table: true,
      },
    });

    return NextResponse.json({ order: fullOrder });
  } catch (err) {
    console.error("PATCH /api/orders/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
