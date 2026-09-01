import assert from "node:assert/strict";
import test from "node:test";
import { applyCashTender, calculateTotals, validateNonCashTender } from "../src/index.ts";

test("canonical totals do not double-discount", () => {
  const result = calculateTotals({
    grossSubtotal: 10_000,
    discount: 1_000,
    taxRateBasisPoints: 1_600,
    taxEnabled: true,
  });
  assert.deepEqual(result, {
    grossSubtotal: 10_000,
    discount: 1_000,
    taxableSubtotal: 9_000,
    tax: 1_440,
    total: 10_440,
  });
});

test("discount is capped at gross subtotal", () => {
  assert.equal(calculateTotals({ grossSubtotal: 500, discount: 900, taxRateBasisPoints: 1600, taxEnabled: true }).total, 0);
});

test("cash over-tender records change, not extra revenue", () => {
  assert.deepEqual(applyCashTender(176_000, 200_000), {
    appliedAmount: 176_000,
    tenderedAmount: 200_000,
    changeGiven: 24_000,
  });
});

test("partial cash payment has no change", () => {
  assert.deepEqual(applyCashTender(80_000, 30_000), {
    appliedAmount: 30_000,
    tenderedAmount: 30_000,
    changeGiven: 0,
  });
});

test("card/online overpayment is rejected", () => {
  assert.throws(() => validateNonCashTender(176_000, 200_000), /cannot exceed/);
});
