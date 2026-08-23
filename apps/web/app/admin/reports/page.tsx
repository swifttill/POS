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

const inputCls =
  "bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm";

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tender, setTender] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMenu()
      .then((m) =>
        setCategories(
          m.categories.map((c) => ({ id: c.id, name: c.name }))
        )
      )
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
      const res = await fetch(`/api/reports?${qs.toString()}`, {
        cache: "no-store",
      });
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

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Analytics</h1>
      <p className="text-muted text-sm mb-6">
        Cross-filter by date, tender, and category.
      </p>

      <div className="card p-4 grid gap-3 sm:grid-cols-4 mb-6">
        <label className="text-sm">
          <span className="text-muted">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls + " w-full mt-1"}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls + " w-full mt-1"}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Tender</span>
          <select
            value={tender}
            onChange={(e) => setTender(e.target.value)}
            className={inputCls + " w-full mt-1"}
          >
            <option value="">All</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls + " w-full mt-1"}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Orders" value={data.summary.orderCount.toString()} />
            <Stat label="Revenue" value={formatPaisa(data.summary.revenue)} />
            <Stat label="Tax" value={formatPaisa(data.summary.tax)} />
            <Stat
              label="Avg / Order"
              value={formatPaisa(data.summary.avgOrder)}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-4">
              <h2 className="font-bold mb-3">Tender Split</h2>
              {data.summary.byTender.length === 0 ? (
                <div className="text-sm text-muted">No payments.</div>
              ) : (
                data.summary.byTender.map((t) => (
                  <div
                    key={t.tender}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-muted">{t.tender}</span>
                    <span>{formatPaisa(t.amount)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="card p-4">
              <h2 className="font-bold mb-3">Revenue by Category</h2>
              {data.byCategory.map((c) => (
                <div key={c.categoryId} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted">
                      {formatPaisa(c.revenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-electric to-cyan"
                      style={{ width: `${(c.revenue / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
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
                      {i.name}{" "}
                      <span className="text-muted">×{i.quantity}</span>
                    </span>
                    <span className="text-muted">{formatPaisa(i.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-panel-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan to-electric"
                      style={{ width: `${(i.revenue / maxItem) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold glow-text">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
