"use client";

import type { MenuItemDTO } from "@/lib/types";
import { formatPaisa } from "@/lib/money";

const STATION_COLORS: Record<string, string> = {
  BAR: "bg-cyan/20 text-cyan",
  GRILL: "bg-orange-500/20 text-orange-300",
  FRY: "bg-amber-500/20 text-amber-300",
  MAIN: "bg-electric/20 text-electric",
  DESSERT: "bg-pink-500/20 text-pink-300",
  EXPO: "bg-emerald-500/20 text-emerald-300",
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
      className="card p-3 text-left flex flex-col gap-2 hover:border-electric/60 transition active:scale-[0.98]"
    >
      <div className="relative h-24 -m-3 mb-0 rounded-t-xl overflow-hidden bg-gradient-to-br from-panel-2 to-abyss flex items-center justify-center">
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
        <span
          className={`absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full ${
            STATION_COLORS[item.printerStation] ?? "bg-line text-muted"
          }`}
        >
          {item.printerStation}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold leading-tight">{item.name}</div>
      </div>
      {item.description ? (
        <div className="text-xs text-muted line-clamp-2">
          {item.description}
        </div>
      ) : null}
      <div className="flex items-center justify-between mt-auto">
        <div className="font-bold glow-text">{formatPaisa(item.price)}</div>
        {hasMods ? (
          <div className="text-[10px] text-muted">+ modifiers</div>
        ) : null}
      </div>
    </button>
  );
}
