import test from "node:test";
import assert from "node:assert/strict";
import { allocateOrderDiscount, assertDiscountAuthority, assertStackingAllowed, calculateDiscountAmount, validateAppliedDiscountSnapshot } from "../src/index.ts";

test("percent discount uses basis points and is capped by eligible gross", () => {
  assert.equal(calculateDiscountAmount({ type: "PERCENT", value: 1250, active: true }, 100_000n), 12_500n);
  assert.equal(calculateDiscountAmount({ type: "FIXED", value: 150_000, active: true }, 100_000n), 100_000n);
});

test("non-stackable discount conflicts are rejected", () => {
  assert.throws(() => assertStackingAllowed({ stackable: false }, [{ id: "d1", active: true, stackable: true }]), /DISCOUNT_STACKING_NOT_ALLOWED/);
  assert.throws(() => assertStackingAllowed({ stackable: true }, [{ id: "d1", active: true, stackable: false }]), /DISCOUNT_STACKING_NOT_ALLOWED/);
});

test("manager approval is action/entity/requestor/context bound and single use", () => {
  const approval = { action: "DISCOUNT_APPLY", entityId: "o1", requestedById: "cashier", contextHash: "ctx1", expiresAt: new Date("2030-01-01"), usedAt: null };
  assert.doesNotThrow(() => assertDiscountAuthority({ source: "CUSTOM", ruleRequiresManager: true, actorCanApplyPreset: true, actorCanApplyCustom: false, actorMaxPercentBps: 500, requestedPercentBps: 1000, approval, expectedOrderId: "o1", actorUserId: "cashier", expectedContextHash: "ctx1", now: new Date("2029-01-01") }));
  assert.throws(() => assertDiscountAuthority({ source: "CUSTOM", ruleRequiresManager: true, actorCanApplyPreset: true, actorCanApplyCustom: false, actorMaxPercentBps: 500, requestedPercentBps: 1000, approval: { ...approval, usedAt: new Date() }, expectedOrderId: "o1", actorUserId: "cashier", expectedContextHash: "ctx1", now: new Date("2029-01-01") }), /APPROVAL_ALREADY_USED/);
});

test("order discount allocation sums exactly and resolves remainder deterministically", () => {
  const result = allocateOrderDiscount(100n, [{ orderItemId: "a", eligibleGross: 100n }, { orderItemId: "b", eligibleGross: 100n }, { orderItemId: "c", eligibleGross: 100n }]);
  assert.deepEqual(result, [{ orderItemId: "a", amount: 34n }, { orderItemId: "b", amount: 33n }, { orderItemId: "c", amount: 33n }]);
  assert.equal(result.reduce((s, x) => s + x.amount, 0n), 100n);
});

test("custom and comp discounts require an auditable reason", () => {
  assert.throws(() => validateAppliedDiscountSnapshot({ nameSnapshot: "Open discount", type: "PERCENT", scope: "ORDER", source: "CUSTOM", valueSnapshot: 500, amount: 500n, appliedByUserId: "u1" }), /DISCOUNT_REASON_REQUIRED/);
  assert.doesNotThrow(() => validateAppliedDiscountSnapshot({ nameSnapshot: "Guest recovery", type: "PERCENT", scope: "ORDER", source: "COMP", valueSnapshot: 10000, amount: 1000n, reason: "Service recovery", appliedByUserId: "u1", approvedByUserId: "m1" }));
});
