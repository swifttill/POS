export type SplitMethod = "EVEN" | "ITEMS";
export type SplitStatus = "OPEN" | "REVERTED";
export type SplitOrderState = Readonly<{
  id: string;
  version: number;
  operationalStatus: "OPEN" | "CLOSED" | "VOIDED";
  financialStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "FULLY_REFUNDED";
  total: bigint;
}>;
export type SplitLine = Readonly<{ orderItemId: string; lineTotal: bigint }>;
export type SplitPartPlan = Readonly<{ label: string; total: bigint; orderItemIds: readonly string[] }>;
export type SplitPlan = Readonly<{ method: SplitMethod; total: bigint; parts: readonly SplitPartPlan[] }>;

function assertSplittableOrder(order: SplitOrderState): void {
  if (order.operationalStatus !== "OPEN") throw new Error("SPLIT_REQUIRES_OPEN_ORDER");
  if (order.financialStatus !== "UNPAID") throw new Error("SPLIT_REQUIRES_UNPAID_ORDER");
  if (order.total <= 0n) throw new Error("SPLIT_REQUIRES_POSITIVE_TOTAL");
}

export function splitEvenly(order: SplitOrderState, count: number): SplitPlan {
  assertSplittableOrder(order);
  if (!Number.isInteger(count) || count < 2 || count > 20) throw new Error("SPLIT_COUNT_INVALID");
  const divisor = BigInt(count);
  const base = order.total / divisor;
  let remainder = order.total % divisor;
  const parts = Array.from({ length: count }, (_, i) => {
    const extra = remainder > 0n ? 1n : 0n;
    if (remainder > 0n) remainder -= 1n;
    return { label: `Bill ${String.fromCharCode(65 + i)}`, total: base + extra, orderItemIds: [] as string[] };
  });
  return { method: "EVEN", total: order.total, parts };
}

/** V1 item split moves whole persisted order lines; fractional line splitting is intentionally excluded. */
export function splitByWholeItems(order: SplitOrderState, lines: readonly SplitLine[], groups: readonly Readonly<{ label: string; orderItemIds: readonly string[] }>[] ): SplitPlan {
  assertSplittableOrder(order);
  if (groups.length < 2 || groups.length > 20) throw new Error("SPLIT_COUNT_INVALID");
  const lineMap = new Map(lines.map(line => [line.orderItemId, line]));
  if (lineMap.size !== lines.length) throw new Error("DUPLICATE_ORDER_ITEM_ID");
  const assigned = new Set<string>();
  const parts = groups.map((group, index) => {
    if (group.orderItemIds.length === 0) throw new Error("EMPTY_SPLIT_PART");
    let total = 0n;
    for (const id of group.orderItemIds) {
      const line = lineMap.get(id);
      if (!line) throw new Error("SPLIT_ITEM_NOT_IN_ORDER");
      if (assigned.has(id)) throw new Error("SPLIT_ITEM_ASSIGNED_TWICE");
      assigned.add(id);
      total += line.lineTotal;
    }
    return { label: group.label.trim() || `Bill ${String.fromCharCode(65 + index)}`, total, orderItemIds: [...group.orderItemIds] };
  });
  if (assigned.size !== lines.length) throw new Error("UNASSIGNED_SPLIT_ITEMS");
  const total = parts.reduce((sum, part) => sum + part.total, 0n);
  if (total !== order.total) throw new Error("SPLIT_TOTAL_MISMATCH");
  return { method: "ITEMS", total, parts };
}

export function assertSplitRevertAllowed(parts: readonly Readonly<{ paidAmount: bigint }>[] ): void {
  if (parts.some(part => part.paidAmount > 0n)) throw new Error("SPLIT_ALREADY_FINANCIALLY_SETTLED");
}

export interface SplitBillingTransaction {
  getOrderForUpdate(orderId: string): Promise<SplitOrderState>;
  assertNoActiveSplit(orderId: string): Promise<void>;
  createSplit(input: Readonly<{ orderId: string; method: SplitMethod; actorUserId: string; parts: readonly SplitPartPlan[] }>): Promise<string>;
  appendAudit(input: Readonly<{ action: string; entityId: string; actorUserId: string; metadata?: unknown }>): Promise<void>;
}
export interface SplitBillingRepository { runSerializable<T>(work: (tx: SplitBillingTransaction) => Promise<T>): Promise<T>; }

export async function persistSplitPlan(repository: SplitBillingRepository, command: Readonly<{ orderId: string; expectedVersion: number; actorUserId: string; plan: SplitPlan }>): Promise<string> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    if (order.version !== command.expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    assertSplittableOrder(order);
    if (order.total !== command.plan.total) throw new Error("SPLIT_TOTAL_STALE");
    await tx.assertNoActiveSplit(order.id);
    const splitId = await tx.createSplit({ orderId: order.id, method: command.plan.method, actorUserId: command.actorUserId, parts: command.plan.parts });
    await tx.appendAudit({ action: "BILL_SPLIT_CREATED", entityId: order.id, actorUserId: command.actorUserId, metadata: { splitId, method: command.plan.method, partCount: command.plan.parts.length } });
    return splitId;
  });
}
