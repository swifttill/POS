"use client";

import { useEffect, useMemo, useState } from "react";

interface Table {
  id: string;
  number: number;
  name: string | null;
  seats: number;
  zone: string | null;
  posX: number;
  posY: number;
}

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("2");
  const [zone, setZone] = useState("Floor");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ number: "", name: "", seats: "2", zone: "Floor" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/tables");
      const data = await res.json();
      setTables(data.tables ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const zones = useMemo(
    () => Array.from(new Set(tables.map((t) => t.zone ?? "Floor"))),
    [tables]
  );

  async function create() {
    setError(null);
    if (!number || Number(number) < 1) {
      setError("Enter a table number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number(number),
          name: name || null,
          seats: Number(seats) || 2,
          zone: zone || "Floor",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      setNumber("");
      setName("");
      setSeats("2");
      setZone("Floor");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number(edit.number),
          name: edit.name || null,
          seats: Number(edit.seats) || 2,
          zone: edit.zone || "Floor",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `Could not update table (${res.status})`);
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this table?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `Could not delete table (${res.status})`);
        return;
      }
      await load();
    } catch {
      setError("Network error");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Tables & Floor</h1>
      <p className="text-sm text-muted mb-4">
        Set up your dining floor. Tables appear in the POS for dine-in orders.
      </p>

      <div className="card p-4 mb-5">
        <div className="section-title mb-2">Add Table</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="text-muted">Number</span>
            <input
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="input mt-1 w-full px-3 py-2"
              placeholder="1"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Name (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1 w-full px-3 py-2"
              placeholder="Window"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Seats</span>
            <input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="input mt-1 w-full px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Zone</span>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="input mt-1 w-full px-3 py-2"
              placeholder="Floor"
            />
          </label>
        </div>
        {error ? <div className="text-xs text-danger mt-2">{error}</div> : null}
        <button
          onClick={create}
          disabled={busy}
          className="btn-primary px-4 py-2 mt-3 disabled:opacity-40"
        >
          Add Table
        </button>
      </div>

      {loading ? (
        <div className="text-muted animate-pulse">Loading…</div>
      ) : (
        zones.map((z) => (
          <div key={z} className="mb-6">
            <div className="section-title mb-2">{z}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tables
                .filter((t) => (t.zone ?? "Floor") === z)
                .map((t) => (
                  <div key={t.id} className="card p-3">
                    {editingId === t.id ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={edit.number}
                          onChange={(e) =>
                            setEdit({ ...edit, number: e.target.value })
                          }
                          className="input w-full px-2 py-1 text-sm"
                        />
                        <input
                          value={edit.name}
                          onChange={(e) =>
                            setEdit({ ...edit, name: e.target.value })
                          }
                          placeholder="Name"
                          className="input w-full px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={edit.seats}
                            onChange={(e) =>
                              setEdit({ ...edit, seats: e.target.value })
                            }
                            className="input w-full px-2 py-1 text-sm"
                          />
                          <input
                            value={edit.zone}
                            onChange={(e) =>
                              setEdit({ ...edit, zone: e.target.value })
                            }
                            className="input w-full px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(t.id)}
                            disabled={busy}
                            className="btn-success flex-1 py-1.5 text-sm disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-secondary flex-1 py-1.5 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold">
                            T{t.number}
                            {t.name ? (
                              <span className="text-muted font-normal"> · {t.name}</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted">{t.seats} seats</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEdit({
                                number: String(t.number),
                                name: t.name ?? "",
                                seats: String(t.seats),
                                zone: t.zone ?? "Floor",
                              });
                            }}
                            className="text-xs text-muted hover:text-text"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(t.id)}
                            className="text-xs text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
