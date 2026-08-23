"use client";

import type { CategoryDTO } from "@/lib/types";

export function CategoryRail({
  categories,
  activeId,
  onSelect,
  showDeals,
  dealsActive,
  onSelectDeals,
}: {
  categories: CategoryDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
  showDeals?: boolean;
  dealsActive?: boolean;
  onSelectDeals?: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
              active ? "btn-primary" : "card text-muted hover:text-text"
            }`}
          >
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.imageUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : null}
            {c.name}
            <span className="ml-1.5 text-xs opacity-70">{c.items.length}</span>
          </button>
        );
      })}
      {showDeals ? (
        <button
          onClick={onSelectDeals}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${
            dealsActive ? "btn-primary" : "card text-muted hover:text-text"
          }`}
        >
          🏷️ Deals
        </button>
      ) : null}
    </div>
  );
}
