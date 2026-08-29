"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type Feature = {
  icon: string;
  name: string;
  description: string;
  status: "Enabled" | "Available" | "Configure";
  href: string;
};

export function SettingsHub({
  company,
  user,
}: {
  company: { name: string; logoUrl: string; gstEnabled: boolean; gstRate: number };
  user: { name: string; role: string };
}) {
  const [query, setQuery] = useState("");

  const features: Feature[] = [
    {
      icon: "%",
      name: "GST on bills",
      description: company.gstEnabled
        ? `GST is enabled at ${company.gstRate}%.`
        : "Optional tax line on bills and reports.",
      status: company.gstEnabled ? "Enabled" : "Configure",
      href: "/admin/company",
    },
    {
      icon: "KOT",
      name: "Kitchen printing",
      description: "Auto-opens station-grouped KOT tickets when orders are held or updated.",
      status: "Enabled",
      href: "/pos",
    },
    {
      icon: "Bill",
      name: "Customer bill printing",
      description: "Thermal bill with logo, GST, totals, paid/balance and Print/PDF support.",
      status: "Enabled",
      href: "/pos",
    },
    {
      icon: "Img",
      name: "Menu image uploads",
      description: "Menu/category/org-logo uploads to Cloudflare R2 with client resize.",
      status: "Enabled",
      href: "/admin/menu",
    },
    {
      icon: "Tbl",
      name: "Table map",
      description: "Dine-in table selection with occupied-table awareness.",
      status: "Enabled",
      href: "/admin/tables",
    },
    {
      icon: "Rpt",
      name: "Reports export",
      description: "Daily/custom/X/Z reports with Print/PDF and Excel-compatible CSV export.",
      status: "Enabled",
      href: "/admin/reports",
    },
    {
      icon: "Role",
      name: "Roles and permissions",
      description: "Admin/manager/waiter roles, PIN reset and permission-level access.",
      status: "Enabled",
      href: "/admin/users",
    },
    {
      icon: "Deal",
      name: "Deals and bundles",
      description: "Promotions, bundles and discount offers for the POS menu.",
      status: "Available",
      href: "/admin/deals",
    },
    {
      icon: "Lock",
      name: "Dashboard privacy",
      description: "Blur dashboard revenue figures on shared screens.",
      status: "Enabled",
      href: "/",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return features;
    return features.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
    );
  }, [query, features]);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <section className="card p-5 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl border border-line bg-panel-2 flex items-center justify-center overflow-hidden shrink-0">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Logo variant="mark" size={38} />
            )}
          </div>
          <div className="min-w-0">
            <div className="section-title">Organisation</div>
            <h2 className="text-xl font-bold truncate">{company.name || "Restaurant"}</h2>
            <p className="text-sm text-muted">Logo, receipt header, currency and GST rules.</p>
            <Link href="/admin/company" className="inline-block mt-3 btn-secondary px-4 py-2 text-sm">
              Edit organisation
            </Link>
          </div>
        </section>

        <section className="card p-5">
          <div className="section-title">Profile</div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-sm text-muted uppercase tracking-wide">{user.role}</p>
          <div className="flex gap-2 mt-4">
            <Link href="/admin/users" className="btn-secondary px-4 py-2 text-sm">
              Manage users
            </Link>
            <Link href="/" className="btn-primary px-4 py-2 text-sm">
              Open dashboard
            </Link>
          </div>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold">Optional Features</h2>
            <p className="text-sm text-muted">Search features and jump to the relevant setup screen.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings..."
            className="input px-3 py-2 text-sm w-full sm:w-64"
          />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((f) => (
            <Link key={f.name} href={f.href} className="border border-line rounded-xl p-4 hover:border-brand/50 transition bg-surface">
              <div className="flex items-center justify-between gap-3">
                <span className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center text-xs font-bold">
                  {f.icon}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-panel-2 text-muted">
                  {f.status}
                </span>
              </div>
              <div className="font-semibold mt-3">{f.name}</div>
              <p className="text-xs text-muted mt-1 line-clamp-2">{f.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
