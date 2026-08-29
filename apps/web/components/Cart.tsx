"use client";

import type { CartLine } from "@/lib/types";
import { formatPaisa } from "@/lib/money";

export function Cart({
  lines,
  currency,
  onQty,
  onRemove,
}: {
  lines: CartLine[];
  currency: string;
  onQty: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted p-6">
        <div className="text-4xl mb-2">🧾</div>
        <div className="text-sm">Cart is empty</div>
        <div className="text-xs mt-1">
          Tap menu items to start an order.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lines.map((l) => {
        const modTotal = l.modifiers.reduce((s, m) => s + m.priceDelta, 0);
        const lineTotal = (l.unitPrice + modTotal) * l.quantity;
        return (
          <div key={l.lineId} className="card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{l.name}</div>
                {l.modifiers.length > 0 ? (
                  <div className="text-xs text-muted">
                    {l.modifiers.map((m) => m.name).join(", ")}
                  </div>
                ) : null}
                {l.notes ? (
                  <div className="text-xs text-muted italic">“{l.notes}”</div>
                ) : null}
                {l.seat ? (
                  <div className="text-[10px] text-muted">Seat {l.seat}</div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold">
                  {formatPaisa(lineTotal, currency)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => onRemove(l.lineId)}
                className="text-xs text-muted hover:text-pink-400"
              >
                Remove
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQty(l.lineId, -1)}
                  className="card w-7 h-7 font-bold"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold">{l.quantity}</span>
                <button
                  onClick={() => onQty(l.lineId, 1)}
                  className="card w-7 h-7 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
