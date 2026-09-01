export type MinorUnits = number;

export type TotalsInput = Readonly<{
  grossSubtotal: MinorUnits;
  discount: MinorUnits;
  taxRateBasisPoints: number;
  taxEnabled: boolean;
}>;

export type Totals = Readonly<{
  grossSubtotal: MinorUnits;
  discount: MinorUnits;
  taxableSubtotal: MinorUnits;
  tax: MinorUnits;
  total: MinorUnits;
}>;

function assertSafeMinorUnits(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer in minor units`);
  }
}

function assertBasisPoints(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 100_000) {
    throw new RangeError("taxRateBasisPoints must be an integer from 0 to 100000");
  }
}

/** Half-up integer division for positive values. */
export function divideAndRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new RangeError("numerator must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError("denominator must be a positive safe integer");
  }
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

/** Canonical V1 exclusive-tax flow: gross -> discount -> taxable -> tax -> total. */
export function calculateTotals(input: TotalsInput): Totals {
  assertSafeMinorUnits(input.grossSubtotal, "grossSubtotal");
  assertSafeMinorUnits(input.discount, "discount");
  assertBasisPoints(input.taxRateBasisPoints);

  const discount = Math.min(input.discount, input.grossSubtotal);
  const taxableSubtotal = input.grossSubtotal - discount;
  const tax = input.taxEnabled
    ? divideAndRoundHalfUp(taxableSubtotal * input.taxRateBasisPoints, 10_000)
    : 0;
  const total = taxableSubtotal + tax;

  if (!Number.isSafeInteger(total)) {
    throw new RangeError("calculated total exceeds safe integer range");
  }

  return {
    grossSubtotal: input.grossSubtotal,
    discount,
    taxableSubtotal,
    tax,
    total,
  };
}

export type CashApplication = Readonly<{
  appliedAmount: MinorUnits;
  tenderedAmount: MinorUnits;
  changeGiven: MinorUnits;
}>;

/** Cash tender above the balance becomes change and never revenue. */
export function applyCashTender(balanceDue: MinorUnits, tenderedAmount: MinorUnits): CashApplication {
  assertSafeMinorUnits(balanceDue, "balanceDue");
  assertSafeMinorUnits(tenderedAmount, "tenderedAmount");

  if (tenderedAmount < balanceDue) {
    return { appliedAmount: tenderedAmount, tenderedAmount, changeGiven: 0 };
  }

  return {
    appliedAmount: balanceDue,
    tenderedAmount,
    changeGiven: tenderedAmount - balanceDue,
  };
}

/** Card/Online cannot exceed remaining balance in V1. */
export function validateNonCashTender(balanceDue: MinorUnits, amount: MinorUnits): MinorUnits {
  assertSafeMinorUnits(balanceDue, "balanceDue");
  assertSafeMinorUnits(amount, "amount");
  if (amount > balanceDue) {
    throw new RangeError("non-cash tender cannot exceed balance due");
  }
  return amount;
}
