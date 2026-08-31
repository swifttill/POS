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
  asc,
  sql,
} from "@swift-till/db";
import { paisaFromRupees } from "@/lib/money";
import { deleteImage } from "@/lib/cloudinary";
import { deleteR2Media, isR2MediaUrl } from "@/lib/r2-media";
import { requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

// Media lifecycle helpers.
//
// Every media URL we store for categories/items can be:
//   - an R2 object (`/media/...`) uploaded via the back office, or
//   - an external/Cloudinary URL.
// We remove an image from active storage only when (a) a safe DB change has
// already succeeded and (b) no OTHER category/item still references the same
// URL (so we never delete shared, still-in-use media). Historical sales/order
// records are never touched here — order items snapshot name/price and their
// `menuItemId` FK is `SET NULL`, so deleting a menu row never removes history.

async function countMediaRefs(
  url: string,
  opts?: { excludeItemId?: string; excludeCategoryId?: string }
): Promise<number> {
  const itemRows = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.imageUrl, url));
  const catRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.imageUrl, url));
  let n = itemRows.length + catRows.length;
  if (opts?.excludeItemId)
    n -= itemRows.filter((r) => r.id === opts.excludeItemId).length;
  if (opts?.excludeCategoryId)
    n -= catRows.filter((r) => r.id === opts.excludeCategoryId).length;
  return n;
}

async function cleanupMedia(
  url: string | null | undefined,
  opts?: { excludeItemId?: string; excludeCategoryId?: string }
): Promise<void> {
  if (!url) return;
  // Never delete a file that is still referenced by another item/category.
  const refs = await countMediaRefs(url, opts);
  if (refs > 0) return;
  if (isR2MediaUrl(url)) {
    await deleteR2Media(url);
  } else {
    await deleteImage(url);
  }
}

async function guard(perm: Permission): Promise<void> {
  const user = await requirePermission(perm);
  if (!user) throw new Error("You do not have permission to do this.");
}

async function nextSort(table: any): Promise<number> {
  const r = await db.select({ c: sql<number>`count(*)` }).from(table);
  return Number(r[0]?.c ?? 0) + 1;
}

export type DealType = "BOGO" | "BUNDLE" | "PERCENT";

export async function updateCompany(data: {
  name?: string;
  address?: string;
  tagline?: string;
  currency?: string;
  gstEnabled?: boolean;
  gstRate?: number;
  logoUrl?: string;
}) {
  await guard("manageCompany");
  await db
    .insert(companies)
    .values({ id: "singleton", ...data })
    .onConflictDoUpdate({ target: companies.id, set: data });
  revalidatePath("/admin/company");
}

export async function createCategory(
  name: string,
  slug: string,
  imageUrl?: string | null
) {
  await guard("manageMenu");
  await db.insert(categories).values({
    name,
    slug,
    imageUrl: imageUrl || null,
    sortOrder: await nextSort(categories),
  });
  revalidatePath("/admin/menu");
}

export async function moveCategory(id: string, direction: "up" | "down") {
  await guard("manageMenu");
  const rows = await db.query.categories.findMany({
    orderBy: asc(categories.sortOrder),
  });
  const idx = rows.findIndex((r) => r.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= rows.length) return;
  const a = rows[idx];
  const b = rows[swap];
  await db
    .update(categories)
    .set({ sortOrder: b.sortOrder })
    .where(eq(categories.id, a.id));
  await db
    .update(categories)
    .set({ sortOrder: a.sortOrder })
    .where(eq(categories.id, b.id));
  revalidatePath("/admin/menu");
}

export async function deleteCategory(id: string) {
  await guard("manageMenu");
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: { items: { columns: { id: true, imageUrl: true } } },
  });
  // Remove the DB records first. If deletion fails (e.g. an FK guard rejects
  // it) we abort BEFORE touching any media, so active files are never removed
  // for an entity that still exists.
  await db.delete(categories).where(eq(categories.id, id));
  if (!category) {
    revalidatePath("/admin");
    revalidatePath("/admin/menu");
    return;
  }
  // Business history is untouched: order items keep snapshots and a `SET NULL`
  // FK, so deleting category/menu rows never removes past orders/reports.
  if (category.imageUrl) {
    await cleanupMedia(category.imageUrl, { excludeCategoryId: id });
  }
  for (const it of category.items) {
    if (it.imageUrl) {
      await cleanupMedia(it.imageUrl, { excludeItemId: it.id });
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/menu");
}

export async function updateCategory(
  id: string,
  data: { name?: string; imageUrl?: string | null; sortOrder?: number }
) {
  await guard("manageMenu");
  const prev = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    columns: { imageUrl: true },
  });
  const set: Record<string, any> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  if (Object.keys(set).length) {
    await db.update(categories).set(set).where(eq(categories.id, id));
  }
  // Replace: old image is no longer referenced by this category and (if not
  // shared) should be removed from active storage.
  const prevUrl = prev?.imageUrl ?? null;
  const nextUrl = data.imageUrl !== undefined ? data.imageUrl : prevUrl;
  if (prevUrl && prevUrl !== nextUrl) {
    await cleanupMedia(prevUrl, { excludeCategoryId: id });
  }
  revalidatePath("/admin/menu");
}

export async function createItem(input: {
  name: string;
  priceRupees: number;
  categoryId: string;
  station: string;
  description?: string;
  available?: boolean;
  imageUrl?: string | null;
}) {
  await guard("manageMenu");
  await db.insert(menuItems).values({
    name: input.name,
    price: paisaFromRupees(input.priceRupees),
    categoryId: input.categoryId,
    printerStation: input.station as any,
    description: input.description || null,
    available: input.available ?? true,
    imageUrl: input.imageUrl || null,
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
    categoryId?: string;
  }
) {
  await guard("manageMenu");
  const prev = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
    columns: { imageUrl: true },
  });
  const data: any = { ...input };
  if (input.priceRupees !== undefined)
    data.price = paisaFromRupees(input.priceRupees);
  if (input.station) data.printerStation = input.station;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  delete data.priceRupees;
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
  // Replace: the old image is no longer referenced by this item; remove it from
  // active storage once the DB update succeeded, unless it is still shared.
  const prevUrl = prev?.imageUrl ?? null;
  const nextUrl = input.imageUrl !== undefined ? input.imageUrl : prevUrl;
  if (prevUrl && prevUrl !== nextUrl) {
    await cleanupMedia(prevUrl, { excludeItemId: id });
  }
  revalidatePath("/admin/menu");
}

export async function moveItem(id: string, direction: "up" | "down") {
  await guard("manageMenu");
  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
  });
  if (!item) return;
  const rows = await db.query.menuItems.findMany({
    where: eq(menuItems.categoryId, item.categoryId),
    orderBy: asc(menuItems.sortOrder),
  });
  const idx = rows.findIndex((r) => r.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= rows.length) return;
  const a = rows[idx];
  const b = rows[swap];
  await db
    .update(menuItems)
    .set({ sortOrder: b.sortOrder })
    .where(eq(menuItems.id, a.id));
  await db
    .update(menuItems)
    .set({ sortOrder: a.sortOrder })
    .where(eq(menuItems.id, b.id));
  revalidatePath("/admin/menu");
}

export async function deleteItem(id: string) {
  await guard("manageMenu");
  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
    columns: { imageUrl: true },
  });
  // Remove the DB record first so active media is never deleted for an entity
  // that still exists. Order history is preserved independently (order items
  // snapshot name/price and reference menu items with a SET NULL FK).
  await db.delete(menuItems).where(eq(menuItems.id, id));
  if (item?.imageUrl) {
    await cleanupMedia(item.imageUrl, { excludeItemId: id });
  }
  revalidatePath("/admin/menu");
}

export async function addModifierGroup(input: {
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
}) {
  await guard("manageMenu");
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

export async function updateModifierGroup(
  id: string,
  data: {
    name?: string;
    minSelect?: number;
    maxSelect?: number;
    required?: boolean;
  }
) {
  await guard("manageMenu");
  await db.update(modifierGroups).set(data).where(eq(modifierGroups.id, id));
  revalidatePath("/admin/menu");
}

export async function deleteModifierGroup(id: string) {
  await guard("manageMenu");
  await db.delete(modifierGroups).where(eq(modifierGroups.id, id));
  revalidatePath("/admin/menu");
}

export async function addModifier(input: {
  groupId: string;
  name: string;
  priceDeltaRupees: number;
}) {
  await guard("manageMenu");
  await db.insert(modifiers).values({
    modifierGroupId: input.groupId,
    name: input.name,
    priceDelta: paisaFromRupees(input.priceDeltaRupees),
    sortOrder: await nextSort(modifiers),
  });
  revalidatePath("/admin/menu");
}

export async function updateModifier(
  id: string,
  data: { name?: string; priceDeltaRupees?: number }
) {
  await guard("manageMenu");
  const set: Record<string, any> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.priceDeltaRupees !== undefined)
    set.priceDelta = paisaFromRupees(data.priceDeltaRupees);
  await db.update(modifiers).set(set).where(eq(modifiers.id, id));
  revalidatePath("/admin/menu");
}

export async function deleteModifier(id: string) {
  await guard("manageMenu");
  await db.delete(modifiers).where(eq(modifiers.id, id));
  revalidatePath("/admin/menu");
}

export async function createDeal(input: {
  name: string;
  type: DealType;
  value: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  items: { menuItemId: string; quantity: number }[];
}) {
  await guard("manageDeals");
  const deal = await db
    .insert(deals)
    .values({
      name: input.name,
      type: input.type,
      value:
        input.type === "PERCENT" ? Math.round(input.value) : paisaFromRupees(input.value),
      active: input.active ?? true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    })
    .returning();
  const dealId = deal[0].id;
  if (input.items.length) {
    await db.insert(dealItems).values(
      input.items.map((i) => ({
        dealId,
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      }))
    );
  }
  revalidatePath("/admin/deals");
}

export async function updateDeal(
  id: string,
  data: {
    name?: string;
    type?: DealType;
    value?: number;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    items?: { menuItemId: string; quantity: number }[];
  }
) {
  await guard("manageDeals");
  const update: Record<string, any> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.type !== undefined) update.type = data.type;
  if (data.value !== undefined)
    update.value =
      (data.type ?? "BUNDLE") === "PERCENT"
        ? Math.round(data.value)
        : paisaFromRupees(data.value);
  if (data.active !== undefined) update.active = data.active;
  if (data.startsAt !== undefined)
    update.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt !== undefined)
    update.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (Object.keys(update).length) {
    await db.update(deals).set(update).where(eq(deals.id, id));
  }
  if (data.items) {
    await db.delete(dealItems).where(eq(dealItems.dealId, id));
    if (data.items.length) {
      await db.insert(dealItems).values(
        data.items.map((i) => ({
          dealId: id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        }))
      );
    }
  }
  revalidatePath("/admin/deals");
}

export async function deleteDeal(id: string) {
  await guard("manageDeals");
  await db.delete(deals).where(eq(deals.id, id));
  revalidatePath("/admin/deals");
}