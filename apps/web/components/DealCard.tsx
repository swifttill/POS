"use client";

import type { DealDTO } from "@/lib/types";
import { formatPaisa } from "@/lib/money";

const TYPE_LABEL: Record<DealDTO["type"], string> = {
  BUNDLE: "BUNDLE",
  BOGO: "BOGO",
  PERCENT: "PERCENT",
};

export function DealCard({
  deal,
  currency,
  onAdd,
}: {
  deal: DealDTO;
  currency: string;
  onAdd: (deal: DealDTO) => void;
}) {
  const cover = deal.items[0]?.imageUrl ?? null;
  const price =
    deal.type === "BUNDLE"
      ? formatPaisa(deal.value, currency)
      : deal.type === "PERCENT"
      ? `${deal.value}% off`
      : "Buy 1 Get 1";
  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="relative h-24 mb-0 rounded-t-xl overflow-hidden bg-gradient-to-br from-panel-2 to-abyss flex items-center justify-center">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={deal.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl opacity-30">🏷️</span>
        )}
        <span className="absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full bg-electric/20 text-electric">
          {TYPE_LABEL[deal.type]}
        </span>
      </div>
      <div className="font-semibold leading-tight">{deal.name}</div>
      <div className="text-xs text-muted">
        {deal.items.map((i) => `${i.quantity}× ${i.name}`).join(" + ")}
      </div>
      <div className="flex items-center justify-between mt-auto">
        <div className="font-bold glow-text">{price}</div>
        <button
          onClick={() => onAdd(deal)}
          className="btn-primary px-3 py-1.5 text-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}
