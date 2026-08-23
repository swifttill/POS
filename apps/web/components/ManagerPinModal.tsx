"use client";

import { useState } from "react";

interface Props {
  title?: string;
  confirmLabel?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManagerPinModal({
  title = "Manager approval",
  confirmLabel = "Approve",
  onSuccess,
  onClose,
}: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setBusy(false);
        return;
      }
      if (data.role !== "ADMIN" && data.role !== "MANAGER") {
        setError("Manager PIN required");
        setBusy(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5"
      >
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted mb-4">Enter a manager PIN to continue.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="w-full bg-panel-2 border border-line rounded-lg px-4 py-3 text-center tracking-[0.5em] text-lg outline-none focus:border-electric"
        />
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg border border-line hover:border-electric/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !pin}
            className="flex-1 btn-primary py-2 disabled:opacity-50"
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
