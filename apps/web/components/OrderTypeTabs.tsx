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
    <div className="flex gap-2">
      {TABS.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              active
                ? "btn-primary"
                : "card text-muted hover:text-text"
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
