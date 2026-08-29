"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { formatPaisa } from "@/lib/money";

type Stats = {
  todaySalesPaisa: number;
  ordersToday: number;
  openOrders: number;
  avgTicketPaisa: number;
};

const QUICK = [
  { key: "new", label: "New Order", hint: "Start a sale", href: "/pos", tone: "primary" },
  { key: "pending", label: "Pending Orders", hint: "Held & unpaid", href: "/pos", tone: "neutral" },
  { key: "tables", label: "Tables", hint: "Floor layout", href: "/admin/tables", tone: "neutral" },
  { key: "menu", label: "Menu", hint: "Items & categories", href: "/admin/menu", tone: "neutral" },
  { key: "reports", label: "Reports", hint: "Sales & analysis", href: "/admin/reports", tone: "neutral" },
  { key: "admin", label: "Settings", hint: "Company & users", href: "/admin/company", tone: "neutral" },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState<string>("");
  const [privacy, setPrivacy] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    setPrivacy(localStorage.getItem("st_privacy") === "1");
    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => setName(d?.name ?? ""))
      .catch(() => {});
    fetch("/api/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
    const t = setInterval(
      () => setClock(new Date().toLocaleTimeString("en-PK")),
      1000
    );
    setClock(new Date().toLocaleTimeString("en-PK"));
    return () => clearInterval(t);
  }, []);

  function togglePrivacy() {
    const next = !privacy;
    setPrivacy(next);
    localStorage.setItem("st_privacy", next ? "1" : "0");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const moneyCls = privacy ? "blur-[6px] select-none" : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <div className="font-semibold">Dashboard</div>
            <div className="text-xs text-muted">
              {name ? `Welcome, ${name}` : "SwiftTill POS"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted tabular-nums hidden sm:inline">{clock}</span>
          <button
            onClick={togglePrivacy}
            className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-brand/50"
            title="Hide monetary values from view"
          >
            {privacy ? "Privacy: On" : "Privacy: Off"}
          </button>
          <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-danger/50 text-danger">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today's Sales" value={stats ? formatPaisa(stats.todaySalesPaisa, "PKR") : "—"} cls={moneyCls} accent="brand" />
          <StatCard title="Orders Today" value={stats ? String(stats.ordersToday) : "—"} />
          <StatCard title="Open / Unpaid" value={stats ? String(stats.openOrders) : "—"} accent="warn" />
          <StatCard title="Avg Ticket" value={stats ? formatPaisa(stats.avgTicketPaisa, "PKR") : "—"} cls={moneyCls} />
        </section>

        <section>
          <h2 className="section-title mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {QUICK.map((q) => (
              <button
                key={q.key}
                onClick={() => router.push(q.href)}
                className={
                  q.tone === "primary"
                    ? "card glow-border p-5 text-left hover:-translate-y-0.5 transition flex flex-col gap-1"
                    : "card p-5 text-left hover:-translate-y-0.5 transition flex flex-col gap-1"
                }
              >
                <span className={q.tone === "primary" ? "text-lg font-semibold text-brand" : "text-lg font-semibold"}>
                  {q.label}
                </span>
                <span className="text-xs text-muted">{q.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5 text-sm text-muted">
          Tip: tap <span className="font-medium text-text">New Order</span> to open the ordering
          screen. Use <span className="font-medium text-text">Privacy</span> to blur revenue figures
          on shared screens.
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  cls = "",
  accent,
}: {
  title: string;
  value: string;
  cls?: string;
  accent?: "brand" | "warn";
}) {
  const ring =
    accent === "brand"
      ? "border-brand/30"
      : accent === "warn"
      ? "border-warn/40"
      : "";
  return (
    <div className={`card p-4 border ${ring}`}>
      <div className="text-xs text-muted">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}
