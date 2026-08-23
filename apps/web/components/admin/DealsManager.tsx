"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaisa } from "@/lib/money";
import { createDeal } from "@/lib/admin-actions";

interface DealView {
  id: string;
  name: string;
  type: "BOGO" | "BUNDLE" | "PERCENT";
  value: number;
  active: boolean;
  items: { id: string; name: string }[];
}
interface ItemOption {
  id: string;
  name: string;
}

const inputCls =
  "w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm";

export function DealsManager({
  deals,
  itemOptions,
}: {
  deals: DealView[];
  itemOptions: ItemOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"BOGO" | "BUNDLE" | "PERCENT">("BUNDLE");
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  async function submit() {
    if (!name.trim() || selected.length === 0) return;
    await createDeal({
      name: name.trim(),
      type,
      valueRupees: Number(value || 0),
      itemIds: selected,
    });
    setName("");
    setValue("");
    setSelected([]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-muted">
          New Deal
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deal name (e.g. Lunch Special)"
            className={inputCls + " flex-1 min-w-[180px]"}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className={inputCls + " w-32"}
          >
            <option value="BUNDLE">Bundle (fixed)</option>
            <option value="BOGO">BOGO</option>
            <option value="PERCENT">Percent off</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "PERCENT" ? "e.g. 10 (%)" : "Package Rs"}
            inputMode="decimal"
            className={inputCls + " w-40"}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {itemOptions.map((i) => {
            const on = selected.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => toggle(i.id)}
                className={`text-left text-sm px-3 py-2 rounded-lg border ${
                  on
                    ? "glow-border"
                    : "border-line hover:border-electric/50"
                }`}
              >
                {on ? "✓ " : ""}
                {i.name}
              </button>
            );
          })}
        </div>
        <button onClick={submit} className="btn-primary px-5 py-2">
          Create Deal
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{d.name}</h3>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-electric/20 text-electric">
                {d.type}
              </span>
            </div>
            <div className="text-sm text-muted mt-1">
              {d.type === "PERCENT"
                ? `${d.value}% off`
                : d.type === "BUNDLE"
                ? `Package ${formatPaisa(d.value)}`
                : "Buy one get one"}
            </div>
            <div className="text-xs text-muted mt-2">
              {d.items.map((i) => i.name).join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
