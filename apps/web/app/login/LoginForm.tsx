"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pin) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Login failed");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (pin.length >= 8) return;
    setPin((p) => p + d);
  }
  function back() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="space-y-4">
      <input
        readOnly
        value={pin}
        placeholder="••••"
        className="w-full input text-center tracking-[0.5em] text-2xl py-3 select-none"
      />
      {error ? <p className="text-sm text-danger text-center">{error}</p> : null}

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="btn-secondary py-3 text-lg font-medium"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={back}
          className="btn-secondary py-3 text-lg font-medium text-muted"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => press("0")}
          className="btn-secondary py-3 text-lg font-medium"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !pin}
          className="btn-primary py-3 text-lg font-semibold disabled:opacity-50"
        >
          {busy ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
