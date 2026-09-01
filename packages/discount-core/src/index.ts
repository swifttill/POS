export type DiscountType = "PERCENT" | "FIXED";
export type DiscountScope = "ORDER" | "ITEM";
export type DiscountSource = "PRESET" | "CUSTOM" | "DEAL" | "COMP";

export type DiscountRule = Readonly<{
  id: string;
  name: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  active: boolean;
  stackable: boolean;
  managerApprovalRequired: boolean;
}>;

export type ExistingDiscount = Readonly<{ id: string; stackable: boolean; active: boolean }>;

function assertMinor(value: bigint, field: string): void {
  if (value < 0n) throw new RangeError(`${field} must be non-negative`);
}

function assertBasisPoints(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new RangeError("DISCOUNT_PERCENT_INVALID");
}

/** Server-authoritative discount amount. PERCENT value is basis points; FIXED value is minor units. */
export function calculateDiscountAmount(rule: Pick<DiscountRule, "type" | "value" | "active">, eligibleGross: bigint): bigint {
  assertMinor(eligibleGross, "eligibleGross");
  if (!rule.active) throw new Error("DISCOUNT_INACTIVE");
  if (!Number.isSafeInteger(rule.value) || rule.value < 0) throw new RangeError("DISCOUNT_VALUE_INVALID");
  if (rule.type === "PERCENT") {
    assertBasisPoints(rule.value);
    return (eligibleGross * BigInt(rule.value) + 5_000n) / 10_000n;
  }
  return BigInt(rule.value) > eligibleGross ? eligibleGross : BigInt(rule.value);
}

export function assertStackingAllowed(candidate: Pick<DiscountRule, "stackable">, existing: readonly ExistingDiscount[]): void {
  const active = existing.filter(d => d.active);
  if (active.length === 0) return;
  if (!candidate.stackable || active.some(d => !d.stackable)) throw new Error("DISCOUNT_STACKING_NOT_ALLOWED");
}

export type DiscountAuthorityInput = Readonly<{
  source: DiscountSource;
  ruleRequiresManager: boolean;
  actorCanApplyPreset: boolean;
  actorCanApplyCustom: boolean;
  actorMaxPercentBps: number;
  requestedPercentBps?: number;
  approval?: Readonly<{
    action: string;
    entityId: string;
    requestedById: string;
    contextHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }>;
  expectedOrderId: string;
  actorUserId: string;
  expectedContextHash: string;
  now?: Date;
}>;

/** Manager approval authorizes this one discount action; it never elevates the cashier session. */
export function assertDiscountAuthority(input: DiscountAuthorityInput): void {
  if (input.source === "CUSTOM" || input.source === "COMP") {
    if (!input.actorCanApplyCustom) return assertValidManagerApproval(input);
  } else if (!input.actorCanApplyPreset) {
    return assertValidManagerApproval(input);
  }

  const exceedsCap = input.requestedPercentBps !== undefined && input.requestedPercentBps > input.actorMaxPercentBps;
  if (input.ruleRequiresManager || exceedsCap) assertValidManagerApproval(input);
}

function assertValidManagerApproval(input: DiscountAuthorityInput): void {
  const approval = input.approval;
  const now = input.now ?? new Date();
  if (!approval) throw new Error("MANAGER_APPROVAL_REQUIRED");
  if (approval.action !== "DISCOUNT_APPLY") throw new Error("APPROVAL_ACTION_MISMATCH");
  if (approval.entityId !== input.expectedOrderId) throw new Error("APPROVAL_ENTITY_MISMATCH");
  if (approval.requestedById !== input.actorUserId) throw new Error("APPROVAL_REQUESTOR_MISMATCH");
  if (approval.contextHash !== input.expectedContextHash) throw new Error("APPROVAL_CONTEXT_MISMATCH");
  if (approval.usedAt) throw new Error("APPROVAL_ALREADY_USED");
  if (approval.expiresAt.getTime() <= now.getTime()) throw new Error("APPROVAL_EXPIRED");
}

export type DiscountAllocationLine = Readonly<{ orderItemId: string; eligibleGross: bigint }>;

/** Deterministic proportional allocation. Remainder cents go by largest fractional remainder, then stable item id. */
export function allocateOrderDiscount(totalDiscount: bigint, lines: readonly DiscountAllocationLine[]): ReadonlyArray<{ orderItemId: string; amount: bigint }> {
  assertMinor(totalDiscount, "totalDiscount");
  if (lines.length === 0) {
    if (totalDiscount !== 0n) throw new Error("NO_ELIGIBLE_LINES");
    return [];
  }
  for (const line of lines) assertMinor(line.eligibleGross, "eligibleGross");
  const totalEligible = lines.reduce((sum, line) => sum + line.eligibleGross, 0n);
  if (totalDiscount > totalEligible) throw new Error("DISCOUNT_EXCEEDS_ELIGIBLE_GROSS");
  if (totalEligible === 0n) {
    if (totalDiscount !== 0n) throw new Error("NO_ELIGIBLE_VALUE");
    return lines.map(line => ({ orderItemId: line.orderItemId, amount: 0n }));
  }

  const working = lines.map(line => {
    const numerator = totalDiscount * line.eligibleGross;
    return { orderItemId: line.orderItemId, amount: numerator / totalEligible, remainder: numerator % totalEligible };
  });
  let remaining = totalDiscount - working.reduce((sum, line) => sum + line.amount, 0n);
  const ranked = [...working].sort((a, b) => a.remainder === b.remainder ? a.orderItemId.localeCompare(b.orderItemId) : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; remaining > 0n; i = (i + 1) % ranked.length) {
    ranked[i].amount += 1n;
    remaining -= 1n;
  }
  const byId = new Map(ranked.map(line => [line.orderItemId, line.amount]));
  return lines.map(line => ({ orderItemId: line.orderItemId, amount: byId.get(line.orderItemId) ?? 0n }));
}

export type AppliedDiscountSnapshot = Readonly<{
  ruleId?: string;
  nameSnapshot: string;
  type: DiscountType;
  scope: DiscountScope;
  source: DiscountSource;
  valueSnapshot: number;
  amount: bigint;
  reason?: string;
  appliedByUserId: string;
  approvedByUserId?: string;
}>;

export function validateAppliedDiscountSnapshot(snapshot: AppliedDiscountSnapshot): void {
  if (!snapshot.nameSnapshot.trim() || snapshot.nameSnapshot.length > 120) throw new Error("DISCOUNT_NAME_INVALID");
  assertMinor(snapshot.amount, "amount");
  if (snapshot.source === "CUSTOM" && !snapshot.reason?.trim()) throw new Error("DISCOUNT_REASON_REQUIRED");
  if (snapshot.source === "COMP" && !snapshot.reason?.trim()) throw new Error("COMP_REASON_REQUIRED");
}

export * from "./discount-service.ts";
