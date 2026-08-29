"use server";

import { db, companies, categories, menuItems, deals, modifierGroups, modifiers, eq, isNull, asc } from "@swift-till/db";

export interface MenuPayload {
  company: {
    name: string;
    address: string | null;
    tagline: string | null;
    currency: string;
    gstEnabled: boolean;
    gstRate: number;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      available: boolean;
      printerStation: string;
      modifierGroups: {
        id: string;
        name: string;
        minSelect: number;
        maxSelect: number;
        required: boolean;
        modifiers: {
          id: string;
          name: string;
          priceDelta: number;
        }[];
      }[];
    }[];
  }[];
  deals: {
    id: string;
    name: string;
    type: "BOGO" | "BUNDLE" | "PERCENT";
    value: number;
    items: { id: string; name: string; price: number; imageUrl: string | null }[];
  }[];
}

// Returns the full menu tree plus company tax config for the FOH terminal.
export async function getMenuPayload(): Promise<MenuPayload> {
  const [company, categoryRows, dealRows] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, "singleton") }),
    db.query.categories.findMany({
      where: isNull(categories.parentId),
      orderBy: asc(categories.sortOrder),
      with: {
        items: {
          where: eq(menuItems.available, true),
          orderBy: asc(menuItems.sortOrder),
          with: {
            modifierGroups: {
              orderBy: asc(modifierGroups.sortOrder),
              with: {
                modifiers: { orderBy: asc(modifiers.sortOrder) },
              },
            },
          },
        },
      },
    }),
    db.query.deals.findMany({
      where: eq(deals.active, true),
      orderBy: asc(deals.name),
      with: {
        items: {
          with: { menuItem: true },
        },
      },
    }),
  ]);

  return {
    company: {
      name: company?.name ?? "SwiftTill",
      address: company?.address ?? null,
      tagline: company?.tagline ?? null,
      currency: company?.currency ?? "PKR",
      gstEnabled: company?.gstEnabled ?? false,
      gstRate: company?.gstRate ?? 0,
    },
    categories: categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        price: i.price,
        imageUrl: i.imageUrl,
        available: i.available,
        printerStation: i.printerStation,
        modifierGroups: i.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          required: g.required,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            priceDelta: m.priceDelta,
          })),
        })),
      })),
    })),
    deals: dealRows.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as "BOGO" | "BUNDLE" | "PERCENT",
      value: d.value,
      items: d.items.map((di) => ({
        id: di.menuItem.id,
        name: di.menuItem.name,
        price: di.menuItem.price,
        imageUrl: di.menuItem.imageUrl,
      })),
    })),
  };
}
