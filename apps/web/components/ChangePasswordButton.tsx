"use client";

import { useState } from "react";

export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed");
        setBusy(false);
        return;
      }
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setBusy(false);
      setTimeout(() => setOpen(false), 1200);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Change Password
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-lg">
        <h3 className="mb-3 text-base font-semibold">Change Password</h3>
        {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
        {done ? <p className="mb-2 text-sm text-success">Password updated</p> : null}
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="input mb-2 w-full px-3 py-2"
        />
        <input
          type="password"
          placeholder="New password (min 6)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input mb-3 w-full px-3 py-2"
        />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={busy || !currentPassword || !newPassword}
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
