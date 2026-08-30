"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaisa } from "@/lib/money";
import {
  createDeal,
  updateDeal,
  deleteDeal,
  type DealType,
} from "@/lib/admin-actions";

interface DealItemView {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}
interface DealView {
  id: string;
  name: string;
  type: DealType;
  value: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  items: DealItemView[];
}
interface ItemOption {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export function DealsManager({
  deals,
  itemOptions,
}: {
  deals: DealView[];
  itemOptions: ItemOption[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; deal: DealView }
    | null
  >(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {deals.length} deal{deals.length !== 1 ? "s" : ""} · combos show on the POS menu
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="btn-primary px-4 py-2 text-sm"
        >
          + New Deal
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          No deals yet. Create a bundle, BOGO, or % off deal.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d) => {
            const cover = d.items.find((i) => i.imageUrl)?.imageUrl ?? null;
            return (
              <div key={d.id} className="card overflow-hidden flex flex-col">
                <div className="relative h-24 bg-panel-2 flex items-center justify-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={d.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl opacity-30">🏷️</span>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                      d.active ? "bg-success-soft text-success" : "bg-danger/10 text-danger"
                    }`}
                  >
                    {d.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold leading-tight">{d.name}</div>
                    <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-brand-soft text-brand shrink-0">
                      {dealTypeLabel(d.type)}
                    </span>
                  </div>
                  <div className="text-brand font-bold text-sm">
                    {dealValueLabel(d)}
                  </div>
                  <div className="text-xs text-muted">
                    {d.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "No items"}
                  </div>
                  {d.startsAt || d.endsAt ? (
                    <div className="text-[10px] text-muted">
                      {d.startsAt ? `From ${d.startsAt}` : ""}
                      {d.startsAt && d.endsAt ? " · " : ""}
                      {d.endsAt ? `Until ${d.endsAt}` : ""}
                    </div>
                  ) : null}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setModal({ mode: "edit", deal: d })}
                      className="text-xs px-2 py-1 rounded border border-line hover:border-brand/50 flex-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        await updateDeal(d.id, { active: !d.active });
                        refresh();
                      }}
                      className={`text-xs px-2 py-1 rounded border flex-1 ${
                        d.active
                          ? "text-success border-success hover:bg-success/10"
                          : "border-line hover:border-muted/50"
                      }`}
                    >
                      {d.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete deal "${d.name}"?`)) {
                          await deleteDeal(d.id);
                          refresh();
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border border-line hover:border-danger/50 hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal ? (
        <DealModal
          mode={modal.mode === "edit" ? "edit" : "create"}
          deal={modal.mode === "edit" ? modal.deal : null}
          itemOptions={itemOptions}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function dealTypeLabel(type: DealType) {
  switch (type) {
    case "BUNDLE":
      return "Bundle";
    case "BOGO":
      return "BOGO";
    case "PERCENT":
      return "% Off";
  }
}

function dealValueLabel(d: DealView) {
  switch (d.type) {
    case "BUNDLE":
      return formatPaisa(d.value);
    case "BOGO":
      return "Buy 1 Get 1";
    case "PERCENT":
      return `${d.value}% off order`;
  }
}

/* ---------------------------------------------------------------------- */
/* Deal create/edit builder                                                */
/* ---------------------------------------------------------------------- */
function DealModal({
  mode,
  deal,
  itemOptions,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  deal: DealView | null;
  itemOptions: ItemOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(deal?.name ?? "");
  const [type, setType] = useState<DealType>(deal?.type ?? "BUNDLE");
  const [value, setValue] = useState(
    deal
      ? deal.type === "BUNDLE"
        ? (deal.value / 100).toString()
        : deal.type === "PERCENT"
        ? deal.value.toString()
        : ""
      : ""
  );
  const [startsAt, setStartsAt] = useState(deal?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(deal?.endsAt ?? "");
  const [active, setActive] = useState(deal?.active ?? true);
  const [selected, setSelected] = useState<
    Record<string, number>
  >(
    () =>
      Object.fromEntries(
        (deal?.items ?? []).map((i) => [i.id, Math.max(1, i.quantity)])
      )
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? itemOptions.filter((i) => i.name.toLowerCase().includes(query))
      : itemOptions;
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [itemOptions, q]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = { ...s };
      if (n[id]) delete n[id];
      else n[id] = 1;
      return n;
    });
  }

  function setQty(id: string, qty: number) {
    setSelected((s) => {
      const n = { ...s };
      if (n[id]) {
        if (qty <= 0) delete n[id];
        else n[id] = qty;
      }
      return n;
    });
  }

  async function save() {
    if (!name.trim()) return;
    const items = Object.entries(selected).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
    }));
    if (items.length === 0) {
      alert("Select at least one menu item for this deal.");
      return;
    }
    if ((type === "BUNDLE" || type === "PERCENT") && Number(value) <= 0) {
      alert(type === "BUNDLE" ? "Enter the package price." : "Enter the discount %.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        value: Number(value || 0),
        active,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        items,
      };
      if (mode === "edit" && deal) await updateDeal(deal.id, payload);
      else await createDeal(payload);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const totalSa = Object.entries(selected).reduce(
    (sum, [id, qty]) => {
      const opt = itemOptions.find((o) => o.id === id);
      return sum + (opt?.price ?? 0) * qty;
    },
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {mode === "edit" ? `Edit "${deal!.name}"` : "New Deal"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-text">×</button>
        </div>

        {/* Basic details */}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm space-y-1 col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted">Deal name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Feast — 2 Karahi + 4 Naan"
              className={inputCls}
              autoFocus
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">Deal type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DealType)}
              className={inputCls}
            >
              <option value="BUNDLE">Bundle — fixed package price</option>
              <option value="BOGO">BOGO — buy one get one</option>
              <option value="PERCENT">Percent — % off on order</option>
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">
              {type === "BUNDLE"
                ? "Package price (Rs)"
                : type === "PERCENT"
                ? "Discount %"
                : "Nothing to set"}
            </span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "PERCENT" ? "e.g. 10" : "0.00"}
              inputMode="decimal"
              disabled={type === "BOGO"}
              className={inputCls + (type === "BOGO" ? " opacity-40" : "")}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">Valid from</span>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">Valid until</span>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="font-medium">Live on POS</span>
        </label>

        {/* Item picker with quantities */}
        <div>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">
            Included items & quantities
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search menu items…"
            className={inputCls + " mb-2"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {options.map((i) => {
              const qty = selected[i.id] ?? 0;
              return (
                <label
                  key={i.id}
                  className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 cursor-pointer transition ${
                    qty > 0 ? "glow-border bg-brand/5" : "border-line hover:border-brand/50"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(i.id);
                  }}
                >
                  {i.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-panel-2 border border-line flex items-center justify-center text-xs text-muted">
                      {i.name.charAt(0)}
                    </div>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{i.name}</span>
                    <span className="block text-[10px] text-muted">
                      {formatPaisa(i.price)}
                    </span>
                  </span>
                  {qty > 0 ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQty(i.id, qty - 1);
                      }}
                      className="h-6 w-6 rounded bg-panel-2 border border-line flex items-center justify-center text-sm hover:border-danger/50"
                    >
                      −
                    </span>
                  ) : null}
                  <span className={`text-sm font-bold w-6 text-center ${qty > 0 ? "text-brand" : "text-muted"}`}>
                    {qty || "+"}
                  </span>
                  {qty > 0 ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQty(i.id, qty + 1);
                      }}
                      className="h-6 w-6 rounded bg-panel-2 border border-line flex items-center justify-center text-sm hover:border-safe"
                    >
                      +
                    </span>
                  ) : null}
                </label>
              );
            })}
            {options.length === 0 ? (
              <div className="text-sm text-muted col-span-2 py-4 text-center">
                No items match. Add menu items first in the Menu section.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted">
            {Object.keys(selected).length} item{Object.keys(selected).length !== 1 ? "s" : ""} selected
          </div>
          <div>
            Items at retail:{" "}
            <span className="font-bold">{formatPaisa(totalSa)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="btn-primary flex-1 py-2 disabled:opacity-40"
          >
            {busy ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Deal"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4 py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-brand text-sm";