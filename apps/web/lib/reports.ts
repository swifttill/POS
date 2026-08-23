import { prisma } from "@swift-till/db";

export interface ReportFilters {
  from?: Date | null;
  to?: Date | null;
  tender?: string | null;
  categoryId?: string | null;
  shiftId?: string | null;
}

export interface ReportResult {
  summary: {
    orderCount: number;
    revenue: number;
    tax: number;
    avgOrder: number;
    byTender: { tender: string; amount: number }[];
  };
  topItems: {
    menuItemId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  byCategory: {
    categoryId: string;
    name: string;
    revenue: number;
    quantity: number;
  }[];
  range: { from: string | null; to: string | null };
}

export async function buildReport(f: ReportFilters): Promise<ReportResult> {
  const where: any = {
    status: { notIn: ["VOIDED", "REFUNDED"] },
    createdAt: {},
  };
  if (f.from) where.createdAt.gte = f.from;
  if (f.to) where.createdAt.lte = f.to;
  if (f.shiftId) where.shiftId = f.shiftId;
  if (f.tender) where.payments = { some: { tender: f.tender } };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { modifiers: true, menuItem: { include: { category: true } } } },
      payments: true,
    },
  });

  let revenue = 0;
  let tax = 0;
  const tenderMap = new Map<string, number>();
  const itemMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  const catMap = new Map<
    string,
    { name: string; revenue: number; quantity: number }
  >();

  for (const o of orders) {
    revenue += o.total;
    tax += o.tax;
    for (const p of o.payments) {
      tenderMap.set(p.tender, (tenderMap.get(p.tender) ?? 0) + p.amount);
    }
    for (const it of o.items) {
      if (!it.menuItem) continue; // deal lines have no category
      if (f.categoryId && it.menuItem.categoryId !== f.categoryId) continue;
      const modTotal = it.modifiers.reduce((s, m) => s + m.priceDelta, 0);
      const lineTotal = (it.unitPrice + modTotal) * it.quantity;

      const im = itemMap.get(it.menuItemId ?? it.name) ?? {
        name: it.name,
        quantity: 0,
        revenue: 0,
      };
      im.quantity += it.quantity;
      im.revenue += lineTotal;
      itemMap.set(it.menuItemId ?? it.name, im);

      const cat = it.menuItem.category;
      const cm = catMap.get(cat.id) ?? {
        name: cat.name,
        revenue: 0,
        quantity: 0,
      };
      cm.revenue += lineTotal;
      cm.quantity += it.quantity;
      catMap.set(cat.id, cm);
    }
  }

  const topItems = Array.from(itemMap.entries())
    .map(([menuItemId, v]) => ({ menuItemId, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  const byCategory = Array.from(catMap.entries())
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const byTender = Array.from(tenderMap.entries()).map(([tender, amount]) => ({
    tender,
    amount,
  }));

  return {
    summary: {
      orderCount: orders.length,
      revenue,
      tax,
      avgOrder: orders.length ? Math.round(revenue / orders.length) : 0,
      byTender,
    },
    topItems,
    byCategory,
    range: {
      from: f.from ? f.from.toISOString().slice(0, 10) : null,
      to: f.to ? f.to.toISOString().slice(0, 10) : null,
    },
  };
}
