"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "pin"
          ? { pin }
          : { identifier, password };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      <div className="flex gap-1 p-1 bg-surface-2 border border-line rounded-xl text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg font-medium ${
            mode === "password" ? "bg-surface text-ink shadow-sm" : "text-muted"
          }`}
        >
          Account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("pin");
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg font-medium ${
            mode === "pin" ? "bg-surface text-ink shadow-sm" : "text-muted"
          }`}
        >
          Staff PIN
        </button>
      </div>

      {error ? <p className="text-sm text-danger text-center">{error}</p> : null}

      {mode === "password" ? (
        <div className="space-y-3">
          <input
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username, email or phone"
            autoComplete="username"
            className="input w-full px-3 py-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="input w-full px-3 py-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !identifier || !password}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-muted text-center">
            Forgot password? Ask an admin to reset it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            autoFocus
            value={pin}
            placeholder="••••"
            inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="input w-full text-center tracking-[0.5em] text-2xl py-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
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
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
