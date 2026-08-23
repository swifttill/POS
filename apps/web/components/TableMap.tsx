"use client";

export interface TableDTO {
  id: string;
  number: number;
  name: string | null;
  seats: number;
  zone: string | null;
  posX: number;
  posY: number;
}

export function TableMap({
  tables,
  selectedId,
  onSelect,
}: {
  tables: TableDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const zones = Array.from(new Set(tables.map((t) => t.zone ?? "Floor")));

  return (
    <div className="space-y-4">
      {zones.map((zone) => (
        <div key={zone}>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">
            {zone}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tables
              .filter((t) => (t.zone ?? "Floor") === zone)
              .map((t) => {
                const active = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`card p-3 text-left transition ${
                      active
                        ? "glow-border"
                        : "hover:border-electric/60"
                    }`}
                  >
                    <div className="text-base font-bold">
                      T{t.number}
                      {t.name ? (
                        <span className="text-muted font-normal"> · {t.name}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted">
                      {t.seats} seats
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
