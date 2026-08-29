"use client";

import { useState } from "react";
import { updateCompany } from "@/lib/admin-actions";
import { ImageField } from "@/components/admin/ImageField";

export function CompanyForm({
  initial,
}: {
  initial: {
    name: string;
    address: string;
    tagline: string;
    currency: string;
    gstEnabled: boolean;
    gstRate: number;
    logoUrl: string;
  };
}) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateCompany({
      name: form.name,
      address: form.address,
      tagline: form.tagline,
      currency: form.currency,
      gstEnabled: form.gstEnabled,
      gstRate: Number(form.gstRate),
      logoUrl: form.logoUrl,
    });
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Restaurant Name">
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Address">
        <input
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Tagline">
        <input
          value={form.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          className="input"
        />
      </Field>
      <ImageField
        label="Logo"
        value={form.logoUrl}
        onUploaded={(u) => set("logoUrl", u ?? "")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Currency">
          <input
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="GST Rate %">
          <input
            type="number"
            step="0.1"
            value={form.gstRate}
            onChange={(e) => set("gstRate", Number(e.target.value))}
            className="input"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.gstEnabled}
          onChange={(e) => set("gstEnabled", e.target.checked)}
        />
        Enable GST on bills
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary px-5 py-2.5">
          Save Settings
        </button>
        {saved ? (
          <span className="text-xs" style={{ color: "var(--color-success)" }}>
            Saved ✓
          </span>
        ) : null}
      </div>

      <style>{`.input{width:100%;background:var(--color-panel-2);border:1px solid var(--color-line);border-radius:.5rem;padding:.5rem .75rem;outline:none}.input:focus{border-color:var(--color-brand)}`}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
