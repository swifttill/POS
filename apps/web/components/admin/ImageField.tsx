"use client";

import { useState } from "react";

export function ImageField({
  label,
  value,
  onUploaded,
  compact = false,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "Upload failed");
      else onUploaded(d.url as string);
    } catch {
      setErr("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="rounded-lg border border-line object-cover"
            style={{ width: compact ? 40 : 56, height: compact ? 40 : 56 }}
          />
        ) : (
          <div
            className="rounded-lg border border-line bg-panel-2"
            style={{ width: compact ? 40 : 56, height: compact ? 40 : 56 }}
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={upload}
          disabled={busy}
          className="text-xs max-w-[160px]"
        />
        {busy ? (
          <span className="text-xs text-muted">Uploading…</span>
        ) : null}
        {value ? (
          <button
            type="button"
            onClick={() => onUploaded("")}
            className="text-xs text-muted hover:text-pink-400"
          >
            Clear
          </button>
        ) : null}
      </div>
      {err ? <div className="text-xs text-pink-400 mt-1">{err}</div> : null}
    </label>
  );
}
