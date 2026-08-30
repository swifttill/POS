"use client";

import type { OrderType } from "@/lib/types";

const TABS: { value: OrderType; label: string; icon: string }[] = [
  { value: "DINE_IN", label: "Dine-In", icon: "🍽️" },
  { value: "TAKEAWAY", label: "Takeaway", icon: "🥡" },
  { value: "DELIVERY", label: "Delivery", icon: "🛵" },
];

export function OrderTypeTabs({
  value,
  onChange,
}: {
  value: OrderType;
  onChange: (v: OrderType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {TABS.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`rounded-xl py-2.5 px-3 flex items-center justify-center gap-1.5 text-sm font-semibold transition w-full h-10 ${
              active ? "btn-primary" : "card text-muted hover:text-text"
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="truncate max-w-[70px]">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}