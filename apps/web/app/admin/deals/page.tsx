import { db, deals, dealItems, menuItems, asc } from "@swift-till/db";
import { DealsManager } from "@/components/admin/DealsManager";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [dealsRows, items] = await Promise.all([
    db.query.deals.findMany({
      orderBy: asc(deals.name),
      with: { items: { with: { menuItem: true } } },
    }),
    db.query.menuItems.findMany({ orderBy: asc(menuItems.name) }),
  ]);

  const dealsView = dealsRows.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type as "BOGO" | "BUNDLE" | "PERCENT",
    value: Number(d.value),
    active: d.active,
    imageUrl: d.imageUrl ?? null,
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
