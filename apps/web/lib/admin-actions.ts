"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  companies,
  categories,
  menuItems,
  modifierGroups,
  modifiers,
  deals,
  dealItems,
  eq,
  sql,
} from "@swift-till/db";
import { paisaFromRupees } from "@/lib/money";
import { deleteImage } from "@/lib/cloudinary";

async function nextSort(table: any): Promise<number> {
  const r = await db.select({ c: sql<number>`count(*)` }).from(table);
  return Number(r[0]?.c ?? 0) + 1;
}

export async function updateCompany(data: {
  name?: string;
  address?: string;
  tagline?: string;
  currency?: string;
  gstEnabled?: boolean;
  gstRate?: number;
  logoUrl?: string;
}) {
  await db
    .insert(companies)
    .values({ id: "singleton", ...data })
    .onConflictDoUpdate({ target: companies.id, set: data });
  revalidatePath("/admin/company");
}

export async function createCategory(name: string, slug: string) {
  await db.insert(categories).values({
    name,
    slug,
    sortOrder: await nextSort(categories),
  });
  revalidatePath("/admin/menu");
}

export async function deleteCategory(id: string) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: { items: { columns: { imageUrl: true } } },
  });
  if (category) {
    // Delete the category image AND every item image it cascades (Cloudinary
    // assets must be removed, not just the DB row).
    if (category.imageUrl) await deleteImage(category.imageUrl);
    for (const it of category.items) {
      if (it.imageUrl) await deleteImage(it.imageUrl);
    }
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin");
  revalidatePath("/admin/menu");
}

export async function updateCategory(
  id: string,
  data: { name?: string; imageUrl?: string | null }
) {
  await db.update(categories).set(data).where(eq(categories.id, id));
  revalidatePath("/admin/menu");
}

export async function createItem(input: {
  name: string;
  priceRupees: number;
  categoryId: string;
  station: string;
  description?: string;
  available?: boolean;
}) {
  await db.insert(menuItems).values({
    name: input.name,
    price: paisaFromRupees(input.priceRupees),
    categoryId: input.categoryId,
    printerStation: input.station as any,
    description: input.description || null,
    available: input.available ?? true,
    sortOrder: await nextSort(menuItems),
  });
  revalidatePath("/admin/menu");
}

export async function updateItem(
  id: string,
  input: {
    name?: string;
    priceRupees?: number;
    station?: string;
    description?: string;
    available?: boolean;
    imageUrl?: string | null;
  }
) {
  const data: any = { ...input };
  if (input.priceRupees !== undefined)
    data.price = paisaFromRupees(input.priceRupees);
  if (input.station) data.printerStation = input.station;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  delete data.priceRupees;
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
  revalidatePath("/admin/menu");
}

export async function deleteItem(id: string) {
  const item = await db.query.menuItems.findFirst({ where: eq(menuItems.id, id) });
  if (item?.imageUrl) await deleteImage(item.imageUrl);
  await db.delete(menuItems).where(eq(menuItems.id, id));
  revalidatePath("/admin/menu");
}

export async function addModifierGroup(input: {
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
}) {
  await db.insert(modifierGroups).values({
    menuItemId: input.menuItemId,
    name: input.name,
    minSelect: input.minSelect,
    maxSelect: input.maxSelect,
    required: input.required,
    sortOrder: await nextSort(modifierGroups),
  });
  revalidatePath("/admin/menu");
}

export async function addModifier(input: {
  groupId: string;
  name: string;
  priceDeltaRupees: number;
}) {
  await db.insert(modifiers).values({
    modifierGroupId: input.groupId,
    name: input.name,
    priceDelta: paisaFromRupees(input.priceDeltaRupees),
    sortOrder: await nextSort(modifiers),
  });
  revalidatePath("/admin/menu");
}

export async function deleteModifier(id: string) {
  await db.delete(modifiers).where(eq(modifiers.id, id));
  revalidatePath("/admin/menu");
}

export async function createDeal(input: {
  name: string;
  type: "BOGO" | "BUNDLE" | "PERCENT";
  valueRupees: number;
  itemIds: string[];
  imageUrl?: string | null;
}) {
  const deal = await db
    .insert(deals)
    .values({
      name: input.name,
      type: input.type,
      value: paisaFromRupees(input.valueRupees),
      active: true,
      imageUrl: input.imageUrl ?? null,
    })
    .returning();
  const dealId = deal[0].id;
  if (input.itemIds.length) {
    await db.insert(dealItems).values(
      input.itemIds.map((menuItemId) => ({ dealId, menuItemId }))
    );
  }
  revalidatePath("/admin/deals");
}

export async function updateDeal(
  id: string,
  data: { name?: string; type?: string; valueRupees?: number; imageUrl?: string | null; active?: boolean }
) {
  const update: Record<string, any> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.type !== undefined) update.type = data.type;
  if (data.valueRupees !== undefined) update.value = paisaFromRupees(data.valueRupees);
  if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length) {
    await db.update(deals).set(update).where(eq(deals.id, id));
    revalidatePath("/admin/deals");
  }
}
