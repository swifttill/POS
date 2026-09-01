import {
  allocateOrderDiscount,
  assertDiscountAuthority,
  assertStackingAllowed,
  calculateDiscountAmount,
  validateAppliedDiscountSnapshot,
  type DiscountAuthorityInput,
  type DiscountRule,
  type DiscountSource,
} from "./index.ts";

export type DiscountOrderState = Readonly<{
  id: string;
  version: number;
  operationalStatus: "OPEN" | "CLOSED" | "VOIDED";
  financialStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "FULLY_REFUNDED";
  alreadyPaid: bigint;
}>;

export type EligibleDiscountLine = Readonly<{ orderItemId: string; eligibleGross: bigint }>;

export interface DiscountTransaction {
  getOrderForUpdate(orderId: string): Promise<DiscountOrderState>;
  getEligibleLines(orderId: string, scope: "ORDER" | "ITEM", targetOrderItemId?: string): Promise<readonly EligibleDiscountLine[]>;
  getActiveDiscounts(orderId: string, targetOrderItemId?: string): Promise<readonly { id: string; stackable: boolean; active: boolean }[]>;
  persistDiscount(input: Readonly<{
    orderId: string;
    orderItemId?: string;
    ruleId?: string;
    nameSnapshot: string;
    type: "PERCENT" | "FIXED";
    scope: "ORDER" | "ITEM";
    source: DiscountSource;
    valueSnapshot: number;
    amount: bigint;
    reason?: string;
    appliedByUserId: string;
    approvedByUserId?: string;
    allocations: readonly { orderItemId: string; amount: bigint }[];
  }>): Promise<string>;
  consumeApproval(approvalId: string): Promise<void>;
  recalculateOrderTotals(orderId: string): Promise<Readonly<{ total: bigint }>>;
  appendAudit(input: Readonly<{ action: string; entityId: string; actorUserId: string; approverUserId?: string; reason?: string; metadata?: unknown }>): Promise<void>;
}

export interface DiscountRepository {
  runSerializable<T>(work: (tx: DiscountTransaction) => Promise<T>): Promise<T>;
}

export type ApplyDiscountCommand = Readonly<{
  orderId: string;
  expectedVersion: number;
  actorUserId: string;
  rule: DiscountRule;
  source: DiscountSource;
  targetOrderItemId?: string;
  reason?: string;
  authority: Omit<DiscountAuthorityInput, "source" | "ruleRequiresManager" | "requestedPercentBps" | "expectedOrderId" | "actorUserId">;
  approvalId?: string;
  approvedByUserId?: string;
}>;

/**
 * Transactional discount application contract.
 * The service locks the order, resolves eligible value, calculates the discount,
 * persists deterministic line allocations and consumes one manager approval atomically when used.
 */
export async function applyDiscount(repository: DiscountRepository, command: ApplyDiscountCommand): Promise<Readonly<{ discountId: string; amount: bigint; total: bigint }>> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    if (order.version !== command.expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    if (order.operationalStatus !== "OPEN") throw new Error("DISCOUNT_REQUIRES_OPEN_ORDER");

    const lines = await tx.getEligibleLines(order.id, command.rule.scope, command.targetOrderItemId);
    if (command.rule.scope === "ITEM" && (!command.targetOrderItemId || lines.length !== 1 || lines[0]?.orderItemId !== command.targetOrderItemId)) {
      throw new Error("DISCOUNT_ITEM_NOT_IN_ORDER");
    }
    const eligibleGross = lines.reduce((sum, line) => sum + line.eligibleGross, 0n);
    if (eligibleGross <= 0n) throw new Error("NO_ELIGIBLE_VALUE");

    const activeDiscounts = await tx.getActiveDiscounts(order.id, command.targetOrderItemId);
    assertStackingAllowed(command.rule, activeDiscounts);
    const amount = calculateDiscountAmount(command.rule, eligibleGross);
    if (amount <= 0n) throw new Error("DISCOUNT_AMOUNT_ZERO");

    assertDiscountAuthority({
      ...command.authority,
      source: command.source,
      ruleRequiresManager: command.rule.managerApprovalRequired,
      requestedPercentBps: command.rule.type === "PERCENT" ? command.rule.value : undefined,
      expectedOrderId: order.id,
      actorUserId: command.actorUserId,
    });

    const snapshot = {
      ruleId: command.rule.id,
      nameSnapshot: command.rule.name,
      type: command.rule.type,
      scope: command.rule.scope,
      source: command.source,
      valueSnapshot: command.rule.value,
      amount,
      reason: command.reason,
      appliedByUserId: command.actorUserId,
      approvedByUserId: command.approvedByUserId,
    } as const;
    validateAppliedDiscountSnapshot(snapshot);
    const allocations = command.rule.scope === "ORDER"
      ? allocateOrderDiscount(amount, lines)
      : [{ orderItemId: lines[0]!.orderItemId, amount }];

    const discountId = await tx.persistDiscount({
      orderId: order.id,
      orderItemId: command.rule.scope === "ITEM" ? command.targetOrderItemId : undefined,
      ...snapshot,
      allocations,
    });
    if (command.approvalId) await tx.consumeApproval(command.approvalId);
    const totals = await tx.recalculateOrderTotals(order.id);
    if (totals.total < order.alreadyPaid) throw new Error("DISCOUNT_WOULD_REDUCE_TOTAL_BELOW_PAID");
    await tx.appendAudit({
      action: "DISCOUNT_APPLIED",
      entityId: order.id,
      actorUserId: command.actorUserId,
      approverUserId: command.approvedByUserId,
      reason: command.reason,
      metadata: { discountId, ruleId: command.rule.id, amount: amount.toString(), scope: command.rule.scope, source: command.source },
    });
    return { discountId, amount, total: totals.total };
  });
}
