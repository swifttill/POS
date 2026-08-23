"use client";

interface OrderRow {
  id: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
  tableNumber: number | null;
  itemCount: number;
}

interface Props {
  orders: OrderRow[];
  onClose: () => void;
  onVoid: (id: string) => void;
  onRefund: (id: string) => void;
  onReprintBill: (id: string) => void;
  onReprintKot: (id: string) => void;
}

function rs(paisa: number) {
  const r = Math.floor(paisa / 100);
  const p = (paisa % 100).toString().padStart(2, "0");
  return `Rs ${r}.${p}`;
}

export default function OrdersModal({
  orders,
  onClose,
  onVoid,
  onRefund,
  onReprintBill,
  onReprintKot,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Orders</h2>
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-text"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-muted">No recent orders.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => {
                const voided = o.status === "VOIDED";
                return (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">
                          #{o.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted">{o.type}</span>
                        {o.tableNumber ? (
                          <span className="text-xs text-muted">
                            T{o.tableNumber}
                          </span>
                        ) : null}
                        {voided ? (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">
                            VOIDED
                          </span>
                        ) : o.status === "REFUNDED" ? (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">
                            REFUNDED
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(o.createdAt).toLocaleString()} ·{" "}
                        {o.itemCount} items · {rs(o.total)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onReprintBill(o.id)}
                        disabled={voided}
                        className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-electric/50 disabled:opacity-40"
                      >
                        Reprint Bill
                      </button>
                      <button
                        onClick={() => onReprintKot(o.id)}
                        disabled={voided}
                        className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-electric/50 disabled:opacity-40"
                      >
                        Reprint KOT
                      </button>
                      <button
                        onClick={() => onVoid(o.id)}
                        disabled={voided || o.status === "REFUNDED"}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Void
                      </button>
                      <button
                        onClick={() => onRefund(o.id)}
                        disabled={voided || o.status === "REFUNDED"}
                        className="text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
                      >
                        Refund
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
