"use client";

import { useState } from "react";

export default function ChangePinButton() {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Failed");
        setBusy(false);
        return;
      }
      setDone(true);
      setCurrentPin("");
      setNewPin("");
      setBusy(false);
      setTimeout(() => setOpen(false), 1200);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1 px-3 py-1.5 rounded-lg border border-line hover:border-brand/50 text-sm"
      >
        Change PIN
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lg space-y-3"
          >
            <h2 className="text-lg font-semibold text-ink">Change your PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Current PIN"
              className="input w-full text-center tracking-[0.4em] text-lg py-2.5"
            />
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="New PIN (4-8 digits)"
              className="input w-full text-center tracking-[0.4em] text-lg py-2.5"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {done ? <p className="text-sm text-success">PIN updated.</p> : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary flex-1 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !currentPin || !newPin}
                className="btn-primary flex-1 py-2 disabled:opacity-50"
              >
                {busy ? "…" : "Update"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
