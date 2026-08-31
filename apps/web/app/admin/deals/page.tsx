import { db, deals, menuItems, asc } from "@swift-till/db";
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
    startsAt: d.startsAt ? d.startsAt.toISOString().slice(0, 10) : null,
    endsAt: d.endsAt ? d.endsAt.toISOString().slice(0, 10) : null,
    items: d.items.map((i) => ({
      id: i.menuItem.id,
      name: i.menuItem.name,
      price: Number(i.menuItem.price),
      imageUrl: i.menuItem.imageUrl,
      quantity: i.quantity,
    })),
  }));

  const itemOptions = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: Number(i.price),
    imageUrl: i.imageUrl,
  }));

  return (
    <div>
      <div className="page-heading"><div><div className="section-title mb-2.5">Promotions</div><h1 className="page-title">Deals & combos</h1><p className="page-subtitle">Create bundles, BOGO offers and percentage promotions that appear directly in the POS.</p></div></div>
      <DealsManager deals={dealsView} itemOptions={itemOptions} />
    </div>
  );
}
