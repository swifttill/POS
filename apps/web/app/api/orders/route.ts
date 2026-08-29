import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { gstAmount } from "@/lib/money";
import { requireManager } from "@/lib/auth";
import type { Station } from "@/lib/types";

// Recent orders (for the FOH Orders panel: reprint / void).
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        table: true,
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        type: o.type,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        tableNumber: o.table?.number ?? null,
        itemCount: o._count.items,
      })),
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
    // Discounts require manager approval (enforced server-side).
    let discountBy: string | null = null;
    if (discountPaisa > 0) {
      const manager = await requireManager();
      if (!manager) {
        return NextResponse.json(
          { error: "Manager approval required for discounts" },
          { status: 401 }
        );
      }
      discountBy = manager.name;
    }

    // Recompute from authoritative DB prices (prevents till tampering).
    const itemIds = body.items
      .map((i) => i.menuItemId)
      .filter((id): id is string => Boolean(id));
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    const company = await prisma.company.findFirst({
      where: { id: "singleton" },
    });
    const gstRate = company?.gstEnabled ? company?.gstRate ?? 0 : 0;

    let subtotal = 0;
    const orderItems = body.items.map((line) => {
      const db = line.menuItemId ? itemMap.get(line.menuItemId) : undefined;
      let name: string;
      let unitPrice: number;
      let station: Station;
      if (db) {
        name = db.name;
        unitPrice = db.price;
        station = db.printerStation as Station;
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
        menuItemId: db ? db.id : null,
        name,
        unitPrice,
        quantity: line.quantity,
        seat: line.seat ?? null,
        notes: line.notes ?? null,
        station,
        modifiers: {
          create: mods.map((m) => ({
            name: m.name,
            priceDelta: m.priceDelta,
          })),
        },
      };
    });

    const tax = gstAmount(subtotal, gstRate);
    // Apply the (manager-approved) discount to the subtotal, then tax the
    // discounted amount.
    const discountedSubtotal = Math.max(0, subtotal - discountPaisa);
    const taxAfter = gstAmount(discountedSubtotal, gstRate);
    const total = discountedSubtotal + taxAfter;

    const paidTotal = (body.payments ?? []).reduce(
      (s, p) => s + p.amount,
      0
    );
    if (paidTotal !== total) {
      return NextResponse.json(
        { error: "Tendered amount does not match total", paidTotal, total },
        { status: 400 }
      );
    }

    const order = await prisma.order.create({
      data: {
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
        status: "OPEN",
        items: { create: orderItems },
        payments: {
          create: (body.payments ?? []).map((p) => ({
            tender: p.tender,
            amount: p.amount,
          })),
        },
      },
      include: {
        items: {
          include: { modifiers: true },
        },
        payments: true,
      },
    });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("POST /api/orders failed", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
