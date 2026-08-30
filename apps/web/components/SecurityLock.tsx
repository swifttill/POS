"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BRAND_NAME } from "@/lib/brand";

const AUTO_LOCK_KEY = "st_auto_lock_minutes";
const DEFAULT_TIMEOUT = 5; // minutes

export function SecurityLock({
  children,
  timeoutMinutes = DEFAULT_TIMEOUT,
  onUnlock,
}: {
  children: React.ReactNode;
  timeoutMinutes?: number;
  onUnlock?: () => void;
}) {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  // Load timeout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(AUTO_LOCK_KEY);
    if (saved) timeoutMinutes = Number(saved);
  }, []);

  function resetTimer() {
    lastActivityRef.current = Date.now();
    if (locked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLocked(true);
    }, timeoutMinutes * 60 * 1000);
  }

  // Track user activity
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locked, timeoutMinutes]);

  async function unlock(pinValue: string) {
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      if (!res.ok) throw new Error("Invalid PIN");
      setLocked(false);
      setPin("");
      setError("");
      resetTimer();
      onUnlock?.();
    } catch {
      setError("Invalid PIN");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    unlock(pin);
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl border border-line p-8 shadow-2xl text-center">
        <Logo size={56} variant="full" showText />
        <h2 className="text-xl font-bold mt-4 transition-opacity duration-300">{BRAND_NAME} is locked</h2>
        <p className="text-muted text-sm mt-2 transition-opacity duration-300">
          Auto-locked after {timeoutMinutes} min of inactivity. Enter your PIN to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 transition-all duration-300">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4-8 digit PIN"
            className="input w-full text-center text-2xl tracking-[0.4em] py-3"
            maxLength={8}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full py-3 text-base">
            Unlock
          </button>
        </form>
        <button
          onClick={() => router.replace("/login")}
          className="mt-4 text-sm text-muted hover:text-text transition-colors duration-300"
        >
          Switch user (logout)
        </button>
      </div>
    </div>
  );
}

export function useAutoLock(timeoutMinutes?: number) {
  const saved = typeof window !== "undefined" ? localStorage.getItem(AUTO_LOCK_KEY) : null;
  return timeoutMinutes ?? (saved ? Number(saved) : DEFAULT_TIMEOUT);
}

export function setAutoLockMinutes(minutes: number) {
  localStorage.setItem(AUTO_LOCK_KEY, String(minutes));
}