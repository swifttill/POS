export type CashMovementType = "CASH_IN" | "CASH_OUT" | "SAFE_DROP" | "ADJUSTMENT";
export type ShiftStatus = "OPEN" | "CLOSING" | "CLOSED";

export interface DrawerInputs {
  openingCash: bigint;
  cashPayments: bigint;
  cashRefunds: bigint;
  cashPaymentReversals: bigint;
  cashIn: bigint;
  cashOut: bigint;
  safeDrops: bigint;
  adjustments: bigint;
}

export function expectedCash(i: DrawerInputs): bigint {
  const values = Object.values(i);
  if (values.some((v) => v < 0n)) throw new Error("DRAWER_INPUT_NEGATIVE");
  return i.openingCash + i.cashPayments - i.cashRefunds - i.cashPaymentReversals + i.cashIn - i.cashOut - i.safeDrops + i.adjustments;
}

export function variance(counted: bigint, expected: bigint): bigint {
  if (counted < 0n || expected < 0n) throw new Error("CASH_COUNT_NEGATIVE");
  return counted - expected;
}

export function requiresVarianceApproval(diff: bigint, threshold: bigint): boolean {
  if (threshold < 0n) throw new Error("INVALID_VARIANCE_THRESHOLD");
  const abs = diff < 0n ? -diff : diff;
  return abs > threshold;
}

export function assertShiftCanClose(input: {status: ShiftStatus; pendingPayments: number; openOrders: number; managerOverrideOpenOrders?: boolean}) {
  if (input.status !== "OPEN") throw new Error("SHIFT_NOT_OPEN");
  if (input.pendingPayments > 0) throw new Error("PENDING_PAYMENTS_BLOCK_CLOSE");
  if (input.openOrders > 0 && !input.managerOverrideOpenOrders) throw new Error("OPEN_ORDERS_BLOCK_CLOSE");
}

export function assertCashMovement(type: CashMovementType, amount: bigint, reason: string) {
  if (amount <= 0n) throw new Error("CASH_MOVEMENT_AMOUNT_INVALID");
  if (!reason.trim()) throw new Error("CASH_MOVEMENT_REASON_REQUIRED");
  if (!(["CASH_IN","CASH_OUT","SAFE_DROP","ADJUSTMENT"] as string[]).includes(type)) throw new Error("CASH_MOVEMENT_TYPE_INVALID");
}

export interface ShiftRepository {
  transaction<T>(fn: (tx: ShiftRepository) => Promise<T>): Promise<T>;
  lockShift(shiftId: string): Promise<{id:string; status:ShiftStatus; openingCash:bigint; userId:string; terminalId:string|null}>;
  countPendingPayments(shiftId:string): Promise<number>;
  countOpenOrdersForShift(shiftId:string): Promise<number>;
  summarizeCashLedger(shiftId:string): Promise<Omit<DrawerInputs,"openingCash">>;
  closeShift(input:{shiftId:string; countedCash:bigint; expectedCash:bigint; difference:bigint; closedByUserId:string; approvedByUserId?:string|null; note?:string|null}): Promise<void>;
  createZSnapshot(input:{shiftId:string; generatedByUserId:string; expectedCash:bigint; countedCash:bigint; difference:bigint; idempotencyKey:string}): Promise<{id:string; reportNumber:string}>;
  appendAudit(input:{action:string; entityId:string; actorUserId:string; approverUserId?:string|null; metadata?:Record<string,unknown>}): Promise<void>;
}

export async function closeShiftAtomic(repo:ShiftRepository, input:{shiftId:string; countedCash:bigint; actorUserId:string; approvalUserId?:string|null; varianceApprovalThreshold:bigint; allowOpenOrderOverride?:boolean; idempotencyKey:string}) {
  if (input.countedCash < 0n) throw new Error("CASH_COUNT_NEGATIVE");
  return repo.transaction(async tx => {
    const shift = await tx.lockShift(input.shiftId);
    const pendingPayments = await tx.countPendingPayments(input.shiftId);
    const openOrders = await tx.countOpenOrdersForShift(input.shiftId);
    assertShiftCanClose({status:shift.status,pendingPayments,openOrders,managerOverrideOpenOrders:input.allowOpenOrderOverride});
    const ledger = await tx.summarizeCashLedger(input.shiftId);
    const expected = expectedCash({openingCash:shift.openingCash,...ledger});
    const diff = variance(input.countedCash, expected);
    if (requiresVarianceApproval(diff,input.varianceApprovalThreshold) && !input.approvalUserId) throw new Error("VARIANCE_APPROVAL_REQUIRED");
    const z = await tx.createZSnapshot({shiftId:shift.id,generatedByUserId:input.actorUserId,expectedCash:expected,countedCash:input.countedCash,difference:diff,idempotencyKey:input.idempotencyKey});
    await tx.closeShift({shiftId:shift.id,countedCash:input.countedCash,expectedCash:expected,difference:diff,closedByUserId:input.actorUserId,approvedByUserId:input.approvalUserId});
    await tx.appendAudit({action:"SHIFT_CLOSED",entityId:shift.id,actorUserId:input.actorUserId,approverUserId:input.approvalUserId,metadata:{zReportId:z.id,reportNumber:z.reportNumber}});
    return {shiftId:shift.id, expectedCash:expected, countedCash:input.countedCash, difference:diff, zReport:z};
  });
}
