"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPaisa } from "@/lib/money";

interface Shift {
  id: string;
  name: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string | null;
  cashStart: number;
  cashEnd: number | null;
}
interface ZReport {
  summary: {
    orderCount: number;
    revenue: number;
    tax: number;
    avgOrder: number;
    byTender: { tender: string; amount: number }[];
  };
}

const inputCls =
  "bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm";

export default function ShiftsPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [zReport, setZReport] = useState<ZReport | null>(null);
  const [openedBy, setOpenedBy] = useState("");
  const [cashStart, setCashStart] = useState("0");
  const [cashEnd, setCashEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/shifts", { cache: "no-store" });
    const d = await res.json();
    setShift(d.shift ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function openShift() {
    setBusy(true);
    try {
      await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openedBy: openedBy || null,
          cashStart: Math.round(Number(cashStart || 0)),
        }),
      });
      setZReport(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function closeShift() {
    if (!shift) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashEnd: cashEnd ? Math.round(Number(cashEnd)) : null,
        }),
      });
      const d = await res.json();
      setZReport(d.report);
      setShift(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Shifts & Z-Report</h1>
      <p className="text-muted text-sm mb-6">
        Open the day, reconcile the drawer, and close with a Z-report.
      </p>

      {zReport ? (
        <div className="card p-5 max-w-lg mb-6">
          <div className="text-sm uppercase tracking-widest text-muted mb-3">
            Z-Report (closed)
          </div>
          <Row label="Orders" value={zReport.summary.orderCount.toString()} />
          <Row label="Revenue" value={formatPaisa(zReport.summary.revenue)} />
          <Row label="Tax" value={formatPaisa(zReport.summary.tax)} />
          <Row
            label="Avg / Order"
            value={formatPaisa(zReport.summary.avgOrder)}
          />
          <div className="border-t border-line my-2" />
          {zReport.summary.byTender.map((t) => (
            <Row key={t.tender} label={t.tender} value={formatPaisa(t.amount)} />
          ))}
          <button
            onClick={() => setZReport(null)}
            className="text-xs text-muted mt-2"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {shift ? (
        <div className="card p-5 max-w-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-emerald-400">Shift OPEN</div>
              <div className="text-xs text-muted">
                {shift.openedBy ? `By ${shift.openedBy} · ` : ""}
                {new Date(shift.openedAt).toLocaleString()}
              </div>
            </div>
          </div>
          <label className="block text-sm mb-3">
            <span className="text-muted">Cash counted at close (Rs)</span>
            <input
              value={cashEnd}
              onChange={(e) => setCashEnd(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className={inputCls + " w-full mt-1"}
            />
          </label>
          <button
            onClick={closeShift}
            disabled={busy}
            className="btn-primary w-full py-2.5 disabled:opacity-40"
          >
            Close Shift & Print Z-Report
          </button>
        </div>
      ) : (
        <div className="card p-5 max-w-lg">
          <div className="text-muted text-sm mb-3">No shift is open.</div>
          <label className="block text-sm">
            <span className="text-muted">Opened by</span>
            <input
              value={openedBy}
              onChange={(e) => setOpenedBy(e.target.value)}
              placeholder="Manager name"
              className={inputCls + " w-full mt-1"}
            />
          </label>
          <label className="block text-sm mt-3">
            <span className="text-muted">Float / cash start (Rs)</span>
            <input
              value={cashStart}
              onChange={(e) => setCashStart(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className={inputCls + " w-full mt-1"}
            />
          </label>
          <button
            onClick={openShift}
            disabled={busy}
            className="btn-primary w-full py-2.5 mt-4 disabled:opacity-40"
          >
            Open Shift (Day Open)
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
