import { NextResponse } from "next/server";
import { db, orders, eq, gte, and, sql } from "@swift-till/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [today] = await db
    .select({
      ordersToday: sql<number>`cast(count(*) as int)`,
      sales: sql<number>`cast(coalesce(sum("total"),0) as int)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), eq(orders.status, "BILLED")));

  const [open] = await db
    .select({ openOrders: sql<number>`cast(count(*) as int)` })
    .from(orders)
    .where(eq(orders.status, "OPEN"));

  const salesPaisa = Number(today?.sales ?? 0);
  const ordersToday = Number(today?.ordersToday ?? 0);
  const openOrders = Number(open?.openOrders ?? 0);
  const avgTicketPaisa = ordersToday > 0 ? Math.round(salesPaisa / ordersToday) : 0;

  return NextResponse.json({
    todaySalesPaisa: salesPaisa,
    ordersToday,
    openOrders,
    avgTicketPaisa,
  });
}
