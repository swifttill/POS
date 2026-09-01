export const LIMITS = Object.freeze({
  itemQuantityMax: 999,
  shortTextMax: 120,
  noteMax: 500,
  customerPhoneMax: 32,
});

export function isPositiveInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0 && value <= max;
}
