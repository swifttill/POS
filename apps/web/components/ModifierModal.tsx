"use client";

import { useMemo, useState } from "react";
import type { CartLine, MenuItemDTO } from "@/lib/types";
import { formatPaisa } from "@/lib/money";

export function ModifierModal({
  item,
  defaultSeat,
  onConfirm,
  onCancel,
}: {
  item: MenuItemDTO;
  defaultSeat: number | null;
  onConfirm: (line: CartLine) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [seat, setSeat] = useState<number | null>(defaultSeat);
  const [notes, setNotes] = useState("");

  function toggle(groupId: string, modId: string, max: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter((m) => m !== modId) };
      }
      if (current.length >= max) {
        // replace oldest when at max for single-select style
        const next = max === 1 ? [modId] : [...current, modId];
        return { ...prev, [groupId]: next };
      }
      return { ...prev, [groupId]: [...current, modId] };
    });
  }

  const { chosenModifiers, unitPrice, totalPerUnit, valid } = useMemo(() => {
    const chosen: { id: string; name: string; priceDelta: number }[] = [];
    let modTotal = 0;
    for (const g of item.modifierGroups) {
      const picked = selected[g.id] ?? [];
      for (const modId of picked) {
        const m = g.modifiers.find((x) => x.id === modId);
        if (m) {
          chosen.push(m);
          modTotal += m.priceDelta;
        }
      }
    }
    const unit = item.price + modTotal;
    const valid = item.modifierGroups.every((g) => {
      const n = (selected[g.id] ?? []).length;
      return n >= g.minSelect && n <= g.maxSelect;
    });
    return { chosenModifiers: chosen, unitPrice: item.price, totalPerUnit: unit, valid };
  }, [item, selected]);

  function confirm() {
    if (!valid) return;
    onConfirm({
      lineId:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      menuItemId: item.id,
      name: item.name,
      unitPrice,
      quantity,
      notes: notes.trim(),
      seat,
      station: item.printerStation,
      modifiers: chosenModifiers.map((m) => ({
        id: m.id,
        name: m.name,
        priceDelta: m.priceDelta,
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-bold">{item.name}</h2>
          <button
            onClick={onCancel}
            className="text-muted hover:text-text text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="text-sm text-muted mb-4">
          Base {formatPaisa(item.price)}
        </div>

        {item.modifierGroups.map((g) => (
          <div key={g.id} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{g.name}</span>
              <span className="text-xs text-muted">
                {g.required ? "Required" : "Optional"} · pick {g.minSelect}-
                {g.maxSelect}
              </span>
            </div>
            <div className="space-y-1.5">
              {g.modifiers.map((m) => {
                const checked = (selected[g.id] ?? []).includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(g.id, m.id, g.maxSelect)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                      checked
                        ? "glow-border"
                        : "border-line hover:border-electric/50"
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="text-muted">
                      {m.priceDelta !== 0
                        ? formatPaisa(m.priceDelta)
                        : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-sm">
            <span className="text-muted">Qty</span>
            <div className="flex items-center gap-2 mt-1">
              <button
                className="card w-9 h-9 font-bold"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button
                className="card w-9 h-9 font-bold"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </label>
          <label className="text-sm">
            <span className="text-muted">Seat</span>
            <input
              type="number"
              min={1}
              value={seat ?? ""}
              onChange={(e) =>
                setSeat(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="—"
              className="mt-1 w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric"
            />
          </label>
        </div>

        <label className="text-sm block mb-4">
          <span className="text-muted">Note (e.g. No Onions)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special request"
            className="mt-1 w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="card px-4 py-3 flex-1 text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!valid}
            className="btn-primary px-4 py-3 flex-1 disabled:opacity-40"
          >
            Add · {formatPaisa(totalPerUnit * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}
