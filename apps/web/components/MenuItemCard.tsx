"use client";
import type { MenuItemDTO } from "@/lib/types";
import { formatPaisa } from "@/lib/money";
export function MenuItemCard({ item, onClick }: { item: MenuItemDTO; onClick: (item: MenuItemDTO) => void }) {
  return <button type="button" onClick={() => onClick(item)} className="group text-left bg-white border border-line rounded-xl overflow-hidden hover:border-brand/60 hover:shadow-sm transition active:scale-[.99] disabled:opacity-50" disabled={!item.available}>
    <div className="relative aspect-[1.35/1] bg-panel overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition"/> : <div className="w-full h-full flex items-center justify-center text-muted text-sm">No image</div>}{!item.available ? <span className="absolute inset-x-0 bottom-0 bg-black/65 text-white text-[11px] text-center py-1">Unavailable</span> : null}</div>
    <div className="p-3"><div className="font-semibold text-[14px] leading-5 line-clamp-2 min-h-10">{item.name}</div>{item.description ? <div className="text-xs text-muted line-clamp-1 mt-1">{item.description}</div> : null}<div className="flex items-center justify-between mt-2"><span className="font-bold text-brand">{formatPaisa(item.price)}</span>{item.modifierGroups.length ? <span className="text-[11px] text-muted">Customize</span> : null}</div></div>
  </button>;
}
