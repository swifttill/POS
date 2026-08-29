"use client";

import { useState } from "react";
import { useImageUpload } from "@/lib/useImageUpload";

export function ImageField({
  label,
  value,
  onUploaded,
  folder = "org",
  compact = false,
}: {
  label: string;
  value: string | null;
  onUploaded: (url: string | null) => void;
  folder?: string;
  compact?: boolean;
}) {
  const { upload, busy } = useImageUpload(folder);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    try {
      const url = await upload(f);
      if (url) onUploaded(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  const size = compact ? 40 : 56;

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
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="rounded-lg border border-dashed border-line bg-panel-2"
            style={{ width: size, height: size }}
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onPick}
          disabled={busy}
          className="text-xs max-w-[160px]"
        />
        {busy ? (
          <span className="text-xs text-muted">Uploading…</span>
        ) : null}
        {value ? (
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="text-xs text-muted hover:text-danger"
          >
            Clear
          </button>
        ) : null}
      </div>
      {err ? <div className="text-xs text-danger mt-1">{err}</div> : null}
    </label>
  );
}
