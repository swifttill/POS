import { NextResponse } from "next/server";
import { db, orders, orderItems, eq, asc } from "@swift-till/db";

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

export const runtime = "nodejs";
