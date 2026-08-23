"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@swift-till/db";
import { paisaFromRupees } from "@/lib/money";
import { deleteImage } from "@/lib/cloudinary";

export async function updateCompany(data: {
  name?: string;
  address?: string;
  tagline?: string;
  currency?: string;
  gstEnabled?: boolean;
  gstRate?: number;
  logoUrl?: string;
}) {
  await prisma.company.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/admin/company");
}

export async function createCategory(name: string, slug: string) {
  await prisma.category.create({
    data: { name, slug, sortOrder: (await prisma.category.count()) + 1 },
  });
  revalidatePath("/admin/menu");
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { items: { select: { imageUrl: true } } },
  });
  if (category) {
    // Delete the category image AND every item image it cascades (Cloudinary
    // assets must be removed, not just the DB row).
    if (category.imageUrl) await deleteImage(category.imageUrl);
    for (const it of category.items) {
      if (it.imageUrl) await deleteImage(it.imageUrl);
    }
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/menu");
}

export async function updateCategory(
  id: string,
  data: { name?: string; imageUrl?: string | null }
) {
  await prisma.category.update({ where: { id }, data });
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
  await prisma.menuItem.create({
    data: {
      name: input.name,
      price: paisaFromRupees(input.priceRupees),
      categoryId: input.categoryId,
      printerStation: input.station as any,
      description: input.description || null,
      available: input.available ?? true,
      sortOrder: (await prisma.menuItem.count()) + 1,
    },
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
  await prisma.menuItem.update({ where: { id }, data });
  revalidatePath("/admin/menu");
}

export async function deleteItem(id: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (item?.imageUrl) await deleteImage(item.imageUrl);
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/admin/menu");
}

export async function addModifierGroup(input: {
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
}) {
  await prisma.modifierGroup.create({
    data: {
      menuItemId: input.menuItemId,
      name: input.name,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      required: input.required,
      sortOrder: (await prisma.modifierGroup.count()) + 1,
    },
  });
  revalidatePath("/admin/menu");
}

export async function addModifier(input: {
  groupId: string;
  name: string;
  priceDeltaRupees: number;
}) {
  await prisma.modifier.create({
    data: {
      modifierGroupId: input.groupId,
      name: input.name,
      priceDelta: paisaFromRupees(input.priceDeltaRupees),
      sortOrder: (await prisma.modifier.count()) + 1,
    },
  });
  revalidatePath("/admin/menu");
}

export async function deleteModifier(id: string) {
  await prisma.modifier.delete({ where: { id } });
  revalidatePath("/admin/menu");
}

export async function createDeal(input: {
  name: string;
  type: "BOGO" | "BUNDLE" | "PERCENT";
  valueRupees: number;
  itemIds: string[];
}) {
  await prisma.deal.create({
    data: {
      name: input.name,
      type: input.type,
      value: paisaFromRupees(input.valueRupees),
      active: true,
      items: {
        create: input.itemIds.map((menuItemId) => ({ menuItemId })),
      },
    },
  });
  revalidatePath("/admin/deals");
}
