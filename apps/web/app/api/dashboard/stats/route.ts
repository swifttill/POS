import { NextResponse } from "next/server";
import { db, orders, eq, gte, and, sql, desc } from "@swift-till/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [[today], [open], billedToday, recent] = await Promise.all([
    db.select({
      ordersToday: sql<number>`cast(count(*) as int)`,
      sales: sql<number>`cast(coalesce(sum("total"),0) as int)`,
    }).from(orders).where(and(gte(orders.createdAt, start), eq(orders.status, "BILLED"))),
    db.select({ openOrders: sql<number>`cast(count(*) as int)` }).from(orders).where(eq(orders.status, "OPEN")),
    db.query.orders.findMany({
      where: and(gte(orders.createdAt, start), eq(orders.status, "BILLED")),
      columns: { createdAt: true, total: true },
    }),
    db.query.orders.findMany({
      orderBy: desc(orders.createdAt),
      limit: 5,
      columns: { id:true, number:true, type:true, status:true, total:true, createdAt:true, waiterName:true, customerName:true },
      with: { table: { columns: { number:true } } },
    }),
  ]);

  const salesPaisa = Number(today?.sales ?? 0);
  const ordersToday = Number(today?.ordersToday ?? 0);
  const openOrders = Number(open?.openOrders ?? 0);
  const avgTicketPaisa = ordersToday > 0 ? Math.round(salesPaisa / ordersToday) : 0;
  const hourlySales = Array.from({length:24},(_,hour)=>({hour,amount:0}));
  for(const order of billedToday){
    const h=new Date(order.createdAt).getHours();
    hourlySales[h].amount += Number(order.total ?? 0);
  }

  return NextResponse.json({
    todaySalesPaisa: salesPaisa,
    ordersToday,
    openOrders,
    avgTicketPaisa,
    hourlySales,
    recentOrders: recent.map(o=>({
      id:o.id, number:o.number, type:o.type, status:o.status, total:o.total, createdAt:o.createdAt,
      waiterName:o.waiterName, customerName:o.customerName, tableNumber:o.table?.number ?? null,
    })),
  });
}
