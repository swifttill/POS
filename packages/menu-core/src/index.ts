export type Money = bigint;

export type Variant = { id: string; name: string; price: Money; active: boolean };
export type ModifierOption = { id: string; name: string; priceDelta: Money; active: boolean };
export type ModifierGroup = {
  id: string; name: string; required: boolean; minSelections: number; maxSelections: number;
  allowDuplicates: boolean; active: boolean; options: ModifierOption[];
};
export type MenuItem = {
  id: string; name: string; basePrice: Money; active: boolean; availableNow: boolean;
  variants: Variant[]; modifierGroups: ModifierGroup[];
};
export type Selection = { groupId: string; optionIds: string[] };

export function assertCatalogItemSellable(item: MenuItem) {
  if (!item.active) throw new Error("ITEM_INACTIVE");
  if (!item.availableNow) throw new Error("ITEM_UNAVAILABLE");
}

export function resolveVariantPrice(item: MenuItem, variantId?: string): Money {
  if (!variantId) return item.basePrice;
  const variant = item.variants.find(v => v.id === variantId && v.active);
  if (!variant) throw new Error("INVALID_VARIANT");
  return variant.price;
}

export function resolveModifierDelta(item: MenuItem, selections: Selection[]): Money {
  const supplied = new Map(selections.map(s => [s.groupId, s.optionIds]));
  let delta = 0n;
  for (const group of item.modifierGroups.filter(g => g.active)) {
    const ids = supplied.get(group.id) ?? [];
    if (group.required && ids.length < group.minSelections) throw new Error("REQUIRED_MODIFIER_MISSING");
    if (ids.length < group.minSelections || ids.length > group.maxSelections) throw new Error("INVALID_MODIFIER_COUNT");
    if (!group.allowDuplicates && new Set(ids).size !== ids.length) throw new Error("DUPLICATE_MODIFIER_NOT_ALLOWED");
    for (const id of ids) {
      const option = group.options.find(o => o.id === id && o.active);
      if (!option) throw new Error("INVALID_MODIFIER_OPTION");
      delta += option.priceDelta;
    }
    supplied.delete(group.id);
  }
  if (supplied.size) throw new Error("MODIFIER_GROUP_NOT_ALLOWED");
  return delta;
}

export function priceCatalogSelection(item: MenuItem, quantity: number, variantId?: string, selections: Selection[] = []) {
  assertCatalogItemSellable(item);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("INVALID_QUANTITY");
  const unitBase = resolveVariantPrice(item, variantId);
  const modifierDelta = resolveModifierDelta(item, selections);
  const unitPrice = unitBase + modifierDelta;
  if (unitPrice < 0n) throw new Error("NEGATIVE_UNIT_PRICE");
  return { unitBase, modifierDelta, unitPrice, lineGross: unitPrice * BigInt(quantity) };
}

export type Deal = {
  id: string; active: boolean; type: "PERCENT" | "FIXED" | "BUNDLE"; value: number;
  eligibleItemIds: string[]; startsAt?: Date; endsAt?: Date;
};
export function calculateDealDiscount(deal: Deal, grossEligible: Money, selectedItemIds: string[], now = new Date()): Money {
  if (!deal.active) throw new Error("DEAL_INACTIVE");
  if (deal.startsAt && now < deal.startsAt) throw new Error("DEAL_NOT_STARTED");
  if (deal.endsAt && now > deal.endsAt) throw new Error("DEAL_EXPIRED");
  if (!selectedItemIds.length || selectedItemIds.some(id => !deal.eligibleItemIds.includes(id))) throw new Error("DEAL_ITEM_NOT_ELIGIBLE");
  if (grossEligible < 0n) throw new Error("INVALID_ELIGIBLE_GROSS");
  if (deal.type === "PERCENT") {
    if (!Number.isInteger(deal.value) || deal.value < 0 || deal.value > 10000) throw new Error("INVALID_DEAL_VALUE");
    return (grossEligible * BigInt(deal.value)) / 10000n;
  }
  if (deal.type === "FIXED") {
    const fixed = BigInt(deal.value);
    return fixed > grossEligible ? grossEligible : fixed;
  }
  throw new Error("BUNDLE_REQUIRES_SERVER_BUNDLE_PRICER");
}
