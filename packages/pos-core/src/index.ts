export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type Money = bigint;

export type PosModifierSnapshot = Readonly<{
  modifierId: string;
  name: string;
  priceDelta: Money;
}>;

export type PosLine = Readonly<{
  id: string;
  menuItemId: string;
  name: string;
  variantName?: string;
  unitBasePrice: Money;
  modifiers: readonly PosModifierSnapshot[];
  quantity: number;
  note?: string;
}>;

export type PosOrderDraft = Readonly<{
  type: OrderType;
  tableId?: string;
  pax?: number;
  customerId?: string;
  deliveryAddress?: string;
  lines: readonly PosLine[];
}>;

export type TableAssignment = Readonly<{
  tableId: string;
  orderId: string;
}>;

export function assertPax(pax: number): void {
  if (!Number.isInteger(pax) || pax < 1 || pax > 999) throw new Error("INVALID_PAX");
}

export function validateOrderContext(order: PosOrderDraft): void {
  if (order.type === "DINE_IN") {
    if (!order.tableId) throw new Error("TABLE_REQUIRED");
    if (order.pax === undefined) throw new Error("PAX_REQUIRED");
    assertPax(order.pax);
  }
  if (order.type !== "DINE_IN" && (order.tableId || order.pax !== undefined)) {
    throw new Error("TABLE_CONTEXT_NOT_ALLOWED");
  }
  if (order.type === "DELIVERY" && !order.deliveryAddress?.trim()) throw new Error("DELIVERY_ADDRESS_REQUIRED");
}

export function assertTableAvailable(assignments: readonly TableAssignment[], tableId: string, currentOrderId?: string): void {
  const assignment = assignments.find(x => x.tableId === tableId);
  if (assignment && assignment.orderId !== currentOrderId) throw new Error("TABLE_OCCUPIED");
}

export function assignTable(assignments: readonly TableAssignment[], tableId: string, orderId: string): TableAssignment[] {
  assertTableAvailable(assignments, tableId, orderId);
  if (assignments.some(x => x.tableId === tableId && x.orderId === orderId)) return [...assignments];
  return [...assignments, { tableId, orderId }];
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("INVALID_QUANTITY");
}

export function lineUnitPrice(line: PosLine): Money {
  return line.unitBasePrice + line.modifiers.reduce((sum, item) => sum + item.priceDelta, 0n);
}

export function lineGross(line: PosLine): Money {
  assertQuantity(line.quantity);
  const price = lineUnitPrice(line);
  if (price < 0n) throw new Error("NEGATIVE_UNIT_PRICE");
  return price * BigInt(line.quantity);
}

export function cartGrossSubtotal(lines: readonly PosLine[]): Money {
  return lines.reduce((sum, line) => sum + lineGross(line), 0n);
}

export function addLine(order: PosOrderDraft, line: PosLine): PosOrderDraft {
  assertQuantity(line.quantity);
  if (!line.id || !line.menuItemId || !line.name.trim()) throw new Error("INVALID_LINE");
  lineGross(line);
  return { ...order, lines: [...order.lines, line] };
}

export function setLineQuantity(order: PosOrderDraft, lineId: string, quantity: number): PosOrderDraft {
  assertQuantity(quantity);
  let found = false;
  const lines = order.lines.map(line => {
    if (line.id !== lineId) return line;
    found = true;
    return { ...line, quantity };
  });
  if (!found) throw new Error("LINE_NOT_FOUND");
  return { ...order, lines };
}

export function removeLine(order: PosOrderDraft, lineId: string): PosOrderDraft {
  if (!order.lines.some(line => line.id === lineId)) throw new Error("LINE_NOT_FOUND");
  return { ...order, lines: order.lines.filter(line => line.id !== lineId) };
}

export function changeOrderType(order: PosOrderDraft, nextType: OrderType, context: { tableId?: string; pax?: number; deliveryAddress?: string } = {}): PosOrderDraft {
  const next: PosOrderDraft = {
    ...order,
    type: nextType,
    tableId: nextType === "DINE_IN" ? context.tableId : undefined,
    pax: nextType === "DINE_IN" ? context.pax : undefined,
    deliveryAddress: nextType === "DELIVERY" ? context.deliveryAddress : undefined,
  };
  validateOrderContext(next);
  return next;
}

export function normalizeNote(note?: string): string | undefined {
  const normalized = note?.trim();
  if (!normalized) return undefined;
  if (normalized.length > 300) throw new Error("NOTE_TOO_LONG");
  return normalized;
}

export * from "./order-management.ts";

export * from "./split-billing.ts";
