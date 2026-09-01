import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 12;

export function validatePin(pin: string): { ok: true } | { ok: false; code: string } {
  if (!/^\d+$/.test(pin)) return { ok: false, code: "PIN_DIGITS_ONLY" };
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) return { ok: false, code: "PIN_LENGTH_INVALID" };
  if (/^(\d)\1+$/.test(pin)) return { ok: false, code: "PIN_TOO_SIMPLE" };
  if (["1234", "4321", "123456", "654321"].includes(pin)) return { ok: false, code: "PIN_TOO_SIMPLE" };
  return { ok: true };
}

export function hashPin(pin: string): string {
  const validation = validatePin(pin);
  if (!validation.ok) throw new Error(validation.code);
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPin(pin: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = scryptSync(pin, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export type LoginThrottle = { failedAttempts: number; lockedUntil: Date | null };
export function nextLoginThrottle(current: LoginThrottle, now = new Date()): LoginThrottle {
  const failedAttempts = current.failedAttempts + 1;
  const lockSeconds = failedAttempts >= 8 ? 300 : failedAttempts >= 5 ? 60 : 0;
  return { failedAttempts, lockedUntil: lockSeconds ? new Date(now.getTime() + lockSeconds * 1000) : null };
}

export function isLoginLocked(state: LoginThrottle, now = new Date()): boolean {
  return !!state.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}
