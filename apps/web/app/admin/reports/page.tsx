"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMenu } from "@/lib/api";
import { formatPaisa } from "@/lib/money";

interface ReportData {
  summary: {
    orderCount: number;
    revenue: number;
    tax: number;
    avgOrder: number;
    byTender: { tender: string; amount: number }[];
  };
  topItems: { menuItemId: string; name: string; quantity: number; revenue: number }[];
  byCategory: { categoryId: string; name: string; revenue: number; quantity: number }[];
}

type ReportType = "daily" | "x" | "z";

const inputCls =
  "bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-brand text-sm";

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tender, setTender] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [companyName, setCompanyName] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMenu()
      .then((m) => {
        setCategories(m.categories.map((c) => ({ id: c.id, name: c.name })));
        setCompanyName(m.company?.name ?? "");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (tender) qs.set("tender", tender);
      if (categoryId) qs.set("categoryId", categoryId);
      const res = await fetch(`/api/reports?${qs.toString()}`, { cache: "no-store" });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [from, to, tender, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const maxItem = Math.max(1, ...(data?.topItems ?? []).map((i) => i.revenue));
  const maxCat = Math.max(1, ...(data?.byCategory ?? []).map((c) => c.revenue));

  const title =
    reportType === "x"
      ? "X Report — Shift (Interim)"
      : reportType === "z"
      ? "Z Report — End of Day (Closing)"
      : "Sales Report";

  function exportExcel() {
    if (!data) return;
    const rows: (string | number)[][] = [];
    const esc = (v: string | number) =>
      `"${String(v).replace(/"/g, '""')}"`;
    rows.push([title]);
    rows.push([`From`, from || "—", `To`, to || "—"]);
    rows.push([]);
    rows.push(["Summary", "Value"]);
    rows.push(["Orders", data.summary.orderCount]);
    rows.push(["Revenue", data.summary.revenue]);
    rows.push(["Tax", data.summary.tax]);
    rows.push(["Avg / Order", data.summary.avgOrder]);
    rows.push([]);
    rows.push(["Tender", "Amount"]);
    data.summary.byTender.forEach((t) => rows.push([t.tender, t.amount]));
    rows.push([]);
    rows.push(["Category", "Revenue", "Quantity"]);
    data.byCategory.forEach((c) => rows.push([c.name, c.revenue, c.quantity]));
    rows.push([]);
    rows.push(["Item", "Quantity", "Revenue"]);
    data.topItems.forEach((i) => rows.push([i.name, i.quantity, i.revenue]));

    const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swifttill-${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="reports-shell">
      <div className="page-heading no-print">
        <div><div className="section-title mb-2.5">Analytics</div><h1 className="page-title">{title}</h1><p className="page-subtitle">Real sales data with date, payment and category filters. Print or export the current view.</p></div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary px-4 py-2 text-sm">
            Print / PDF
          </button>
          <button onClick={exportExcel} className="btn-primary px-4 py-2 text-sm">
            Export Excel
          </button>
        </div>
      </div>

      <div className="card p-4 md:p-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-6 no-print">
        <label className="text-sm">
          <span className="text-muted">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls + " w-full mt-1"} />
        </label>
        <label className="text-sm">
          <span className="text-muted">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls + " w-full mt-1"} />
        </label>
        <label className="text-sm">
          <span className="text-muted">Tender</span>
          <select value={tender} onChange={(e) => setTender(e.target.value)} className={inputCls + " w-full mt-1"}>
            <option value="">All</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls + " w-full mt-1"}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">Report</span>
          <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className={inputCls + " w-full mt-1"}>
            <option value="daily">Daily / Custom</option>
            <option value="x">X (Shift)</option>
            <option value="z">Z (End of Day)</option>
          </select>
        </label>
      </div>

      <div className="print-area">
        <div className="mb-4">
          <div className="text-xl font-extrabold text-ink">{title}</div>
          <div className="text-sm text-muted">
            {companyName ? `${companyName} · ` : ""}
            {from || to ? `${from || "…"} → ${to || "…"}` : "All dates"}
            {reportType === "z" ? " · Closing snapshot" : ""}
          </div>
        </div>

        {loading ? (
          <div className="text-muted">Loading…</div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Orders" value={data.summary.orderCount.toString()} />
              <Stat label="Revenue" value={formatPaisa(data.summary.revenue)} />
              <Stat label="Tax" value={formatPaisa(data.summary.tax)} />
              <Stat label="Avg / Order" value={formatPaisa(data.summary.avgOrder)} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-4">
                <h2 className="font-bold mb-3">Tender Split</h2>
                {data.summary.byTender.length === 0 ? (
                  <div className="text-sm text-muted">No payments.</div>
                ) : (
                  data.summary.byTender.map((t) => (
                    <div key={t.tender} className="flex justify-between text-sm py-1">
                      <span className="text-muted">{t.tender}</span>
                      <span>{formatPaisa(t.amount)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card p-4">
                <h2 className="font-bold mb-3">Revenue by Category</h2>
                {data.byCategory.length === 0 ? (
                  <div className="text-sm text-muted">No sales.</div>
                ) : (
                  data.byCategory.map((c) => (
                    <div key={c.categoryId} className="mb-2">
                      <div className="flex justify-between text-sm">
                        <span>{c.name}</span>
                        <span className="text-muted">{formatPaisa(c.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${(c.revenue / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="font-bold mb-3">Top Selling Items</h2>
              {data.topItems.length === 0 ? (
                <div className="text-sm text-muted">No items sold.</div>
              ) : (
                data.topItems.map((i) => (
                  <div key={i.menuItemId} className="mb-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {i.name} <span className="text-muted">×{i.quantity}</span>
                      </span>
                      <span className="text-muted">{formatPaisa(i.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${(i.revenue / maxItem) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-extrabold text-ink tracking-tight">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
