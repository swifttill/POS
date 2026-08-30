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
  occupiedAt,
  onSelect,
}: {
  tables: TableDTO[];
  selectedId: string | null;
  occupiedAt?: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const zones = Array.from(new Set(tables.map((t) => t.zone ?? "Floor")));
  const now = Date.now();

  function elapsed(timestamp: string): string {
    const ms = now - new Date(timestamp).getTime();
    if (ms < 60000) return "just now";
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

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
                const occupied = occupiedAt?.[t.id] ? true : false;
                const since = occupiedAt?.[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`card p-3 text-left transition aspect-square rounded-xl ${
                      active ? "glow-border bg-brand/5" : occupied
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
                      {occupied ? (
                        <span className="text-[9px] uppercase text-danger">
                          {elapsed(since ?? "")}
                        </span>
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