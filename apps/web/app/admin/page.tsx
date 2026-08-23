import Link from "next/link";
import { prisma } from "@swift-till/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [categories, items, deals, tables, orders] = await Promise.all([
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.deal.count(),
    prisma.restaurantTable.count(),
    prisma.order.count(),
  ]);

  const stats = [
    { label: "Categories", value: categories, href: "/admin/menu" },
    { label: "Menu Items", value: items, href: "/admin/menu" },
    { label: "Deals", value: deals, href: "/admin/deals" },
    { label: "Tables", value: tables, href: "/admin/menu" },
    { label: "Orders (all)", value: orders, href: "/" },
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
