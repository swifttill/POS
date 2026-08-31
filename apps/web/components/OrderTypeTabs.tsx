"use client";
import type { OrderType } from "@/lib/types";
import { PosIcon } from "./PosIcon";

const TABS:{value:OrderType;label:string;hint:string;icon:string}[]=[
 {value:"DINE_IN",label:"Dine in",hint:"Table service",icon:"table"},
 {value:"TAKEAWAY",label:"Takeaway",hint:"Counter pickup",icon:"order"},
 {value:"DELIVERY",label:"Delivery",hint:"Customer address",icon:"arrow"},
];
export function OrderTypeTabs({value,onChange}:{value:OrderType;onChange:(v:OrderType)=>void}){
 return <div className="grid grid-cols-3 gap-2">{TABS.map(t=><button key={t.value} onClick={()=>onChange(t.value)} className={`min-h-[66px] rounded-xl border p-2.5 flex flex-col items-center justify-center gap-1.5 text-center transition ${value===t.value?"bg-brand text-white border-brand shadow-[0_7px_16px_rgba(255,121,0,.2)]":"bg-white text-text border-line hover:border-brand/35 hover:bg-brand-soft/25"}`}><span className={`w-7 h-7 rounded-lg flex items-center justify-center ${value===t.value?"bg-white/16":"bg-surface-2 text-muted"}`}><PosIcon name={t.icon} size={15}/></span><span className="text-xs font-extrabold leading-none">{t.label}</span><span className={`hidden xl:block text-[9px] leading-none ${value===t.value?"text-white/70":"text-muted"}`}>{t.hint}</span></button>)}</div>
}
