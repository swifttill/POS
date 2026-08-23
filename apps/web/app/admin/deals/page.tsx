import { prisma } from "@swift-till/db";
import { DealsManager } from "@/components/admin/DealsManager";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, items] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { name: "asc" },
      include: { items: { include: { menuItem: true } } },
    }),
    prisma.menuItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  const dealsView = deals.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    value: Number(d.value),
    active: d.active,
    items: d.items.map((i) => ({
      id: i.id,
      name: i.menuItem.name,
    })),
  }));

  const itemOptions = items.map((i) => ({ id: i.id, name: i.name }));

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Deals & Combos</h1>
      <p className="text-muted text-sm mb-6">
        Bundled packages, BOGO, and percentage discounts.
      </p>
      <DealsManager deals={dealsView} itemOptions={itemOptions} />
    </div>
  );
}
