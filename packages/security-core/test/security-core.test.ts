import test from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin, validatePin, nextLoginThrottle, isLoginLocked } from "../src/index.ts";

test("PIN hashing verifies correct PIN and rejects incorrect PIN", () => {
  const hash = hashPin("5729");
  assert.equal(verifyPin("5729", hash), true);
  assert.equal(verifyPin("5728", hash), false);
  assert.equal(hash.includes("5729"), false);
});

test("weak PINs are rejected", () => {
  assert.equal(validatePin("1234").ok, false);
  assert.equal(validatePin("1111").ok, false);
  assert.equal(validatePin("57a9").ok, false);
  assert.equal(validatePin("5729").ok, true);
});

test("login throttle introduces temporary lockouts", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  let state = { failedAttempts: 0, lockedUntil: null as Date | null };
  for (let i = 0; i < 5; i++) state = nextLoginThrottle(state, now);
  assert.equal(isLoginLocked(state, new Date("2026-09-01T00:00:30Z")), true);
  assert.equal(isLoginLocked(state, new Date("2026-09-01T00:01:01Z")), false);
});
