import Link from "next/link";
import { db, categories, menuItems, deals, restaurantTables, orders, sql } from "@swift-till/db";

export const dynamic = "force-dynamic";

async function countRows(table: any): Promise<number> {
  const r = await db.select({ c: sql<number>`count(*)` }).from(table);
  return Number(r[0]?.c ?? 0);
}

export default async function AdminDashboard() {
  const [catCount, itemCount, dealCount, tableCount, orderCount] = await Promise.all([
    countRows(categories),
    countRows(menuItems),
    countRows(deals),
    countRows(restaurantTables),
    countRows(orders),
  ]);

  const stats = [
    { label: "Categories", value: catCount, href: "/admin/menu" },
    { label: "Menu Items", value: itemCount, href: "/admin/menu" },
    { label: "Deals", value: dealCount, href: "/admin/deals" },
    { label: "Tables", value: tableCount, href: "/admin/menu" },
    { label: "Orders (all)", value: orderCount, href: "/" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Back Office</h1>
      <p className="text-muted text-sm mb-6">
        Manage your menu, deals, and company settings.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card p-4 hover:border-electric/60 transition"
          >
            <div className="text-3xl font-bold glow-text">{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
