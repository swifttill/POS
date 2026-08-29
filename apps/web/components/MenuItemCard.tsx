"use client";

import type { MenuItemDTO } from "@/lib/types";
import { formatPaisa } from "@/lib/money";

const STATION_COLORS: Record<string, string> = {
  BAR: "bg-brand-soft text-brand",
  GRILL: "bg-orange-100 text-orange-700",
  FRY: "bg-amber-100 text-amber-700",
  MAIN: "bg-brand-soft text-brand",
  DESSERT: "bg-pink-100 text-pink-700",
  EXPO: "bg-success-soft text-success",
};

export function MenuItemCard({
  item,
  onClick,
}: {
  item: MenuItemDTO;
  onClick: (item: MenuItemDTO) => void;
}) {
  const hasMods = item.modifierGroups.length > 0;
  return (
    <button
      onClick={() => onClick(item)}
      className="card p-3 text-left flex flex-col gap-2 hover:border-brand/60 transition active:scale-[0.98]"
    >
      <div className="relative h-24 -m-3 mb-0 rounded-t-xl overflow-hidden bg-panel-2 flex items-center justify-center">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl opacity-30">🍽️</span>
        )}
        {item.printerStation ? (
          <span
            className={`absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${
              STATION_COLORS[item.printerStation] ?? "bg-panel-2 text-muted"
            }`}
          >
            {item.printerStation}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="font-semibold leading-tight truncate">{item.name}</div>
      </div>
      {item.description ? (
        <div className="text-xs text-muted line-clamp-2">{item.description}</div>
      ) : null}
      <div className="flex items-center justify-between mt-auto">
        <div className="font-bold text-brand">{formatPaisa(item.price)}</div>
        {hasMods ? (
          <div className="text-[10px] text-muted">+ modifiers</div>
        ) : null}
      </div>
    </button>
  );
}
