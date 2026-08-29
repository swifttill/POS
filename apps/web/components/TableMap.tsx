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
  occupiedIds,
  onSelect,
}: {
  tables: TableDTO[];
  selectedId: string | null;
  occupiedIds?: string[];
  onSelect: (id: string) => void;
}) {
  const zones = Array.from(new Set(tables.map((t) => t.zone ?? "Floor")));
  const occupied = new Set(occupiedIds ?? []);

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
                const isOccupied = occupied.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`card p-3 text-left transition ${
                      active
                        ? "glow-border"
                        : isOccupied
                        ? "border-danger/40 bg-danger/5"
                        : "hover:border-brand/60"
                    }`}
                  >
                    <div className="text-base font-bold flex items-center justify-between">
                      <span>
                        T{t.number}
                        {t.name ? (
                          <span className="text-muted font-normal"> · {t.name}</span>
                        ) : null}
                      </span>
                      {isOccupied ? (
                        <span className="text-[9px] uppercase text-danger">occupied</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted">{t.seats} seats</div>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
