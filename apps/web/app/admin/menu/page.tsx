import { db, categories, menuItems, modifierGroups, modifiers, asc } from "@swift-till/db";
import { MenuManager } from "@/components/admin/MenuManager";
import type { Station } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATIONS: Station[] = ["BAR", "GRILL", "FRY", "MAIN", "DESSERT", "EXPO"];

type ModifierDTO = {
  id: string;
  name: string;
  priceDelta: number;
};
type GroupDTO = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  modifiers: ModifierDTO[];
};
type ItemDTO = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  printerStation: Station;
  imageUrl: string | null;
  modifierGroups: GroupDTO[];
};
type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  items: ItemDTO[];
};

export default async function MenuPage() {
  const rows = await db.query.categories.findMany({
    orderBy: asc(categories.sortOrder),
    with: {
      items: {
        orderBy: asc(menuItems.sortOrder),
        with: {
          modifierGroups: {
            orderBy: asc(modifierGroups.sortOrder),
            with: { modifiers: { orderBy: asc(modifiers.sortOrder) } },
          },
        },
      },
    },
  });

  const categoriesView: CategoryDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: Number(i.price),
      available: i.available,
      printerStation: i.printerStation as Station,
      imageUrl: i.imageUrl,
      modifierGroups: i.modifierGroups.map((g) => ({
        id: g.id,
        name: g.name,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        required: g.required,
        modifiers: g.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          priceDelta: Number(m.priceDelta),
        })),
      })),
    })),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Menu Engineering</h1>
      <p className="text-muted text-sm mb-6">
        Categories, items, and nested modifiers.
      </p>
      <MenuManager categories={categoriesView} stations={STATIONS} />
    </div>
  );
}
