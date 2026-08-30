"use client";
import type { OrderType } from "@/lib/types";
import { PosIcon } from "./PosIcon";

const TABS: { value: OrderType; label: string; icon: string }[] = [
  { value: "DINE_IN", label: "Dine in", icon: "table" },
  { value: "TAKEAWAY", label: "Takeaway", icon: "order" },
  { value: "DELIVERY", label: "Delivery", icon: "arrow" },
];

export function OrderTypeTabs({ value, onChange }: { value: OrderType; onChange: (v: OrderType) => void }) {
  return <div className="grid grid-cols-3 gap-2">{TABS.map(t => <button key={t.value} onClick={() => onChange(t.value)} className={`h-11 rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold transition ${value === t.value ? "bg-brand text-white border-brand" : "bg-white text-text border-line hover:bg-surface-2"}`}><PosIcon name={t.icon} size={16}/>{t.label}</button>)}</div>;
}
