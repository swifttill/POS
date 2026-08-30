"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPaisa } from "@/lib/money";
import { PosIcon } from "@/components/PosIcon";

interface Stats { todaySalesPaisa:number; ordersToday:number; openOrders:number; avgTicketPaisa:number; }

export default function AdminDashboard(){
 const [stats,setStats]=useState<Stats|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/dashboard/stats",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(setStats).catch(()=>{}).finally(()=>setLoading(false))},[]);
 const kpis=[
  {label:"Today's sales",value:stats?formatPaisa(stats.todaySalesPaisa):"—",hint:stats?`${stats.ordersToday} billed orders today`:"Waiting for data",icon:"chart"},
  {label:"Orders today",value:stats?String(stats.ordersToday):"—",hint:"Completed bills",icon:"order"},
  {label:"Open orders",value:stats?String(stats.openOrders):"—",hint:"Held / unpaid",icon:"clock"},
  {label:"Average ticket",value:stats?formatPaisa(stats.avgTicketPaisa):"—",hint:"Per billed order",icon:"grid"},
 ];
 const actions=[
  ["Open POS","Start a new bill","/pos","order"],
  ["Manage menu","Categories, items & modifiers","/admin/menu","menu"],
  ["Orders","Find, review & reprint bills","/pos","order"],
  ["Tables","Floor layout & table status","/admin/tables","table"],
  ["Reports","Sales, payments & cashier reports","/admin/reports","chart"],
  ["Staff","Users, roles & permissions","/admin/users","users"],
 ] as const;
 return <div className="space-y-6">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="section-title mb-2">Overview</div><h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">Today at a glance</h1><p className="text-sm text-muted mt-1">A clean operating view of your restaurant POS.</p></div><div className="flex gap-2"><button className="btn-secondary h-10">Today</button><Link href="/pos" className="btn-primary h-10 flex items-center gap-2"><PosIcon name="plus" size={16}/> New order</Link></div></div>
  <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{kpis.map(k=><div key={k.label} className="card p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold text-muted">{k.label}</div><div className="text-2xl font-extrabold text-ink mt-2">{loading?"—":k.value}</div></div><div className="w-9 h-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><PosIcon name={k.icon} size={17}/></div></div><div className="text-xs text-muted mt-3">{k.hint}</div></div>)}</section>
  <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-4">
   <div className="card p-5"><div className="flex items-center justify-between mb-5"><div><h2 className="font-bold text-lg">Sales performance</h2><p className="text-xs text-muted mt-1">Use Reports for detailed date and cashier filters.</p></div><Link href="/admin/reports" className="text-xs font-bold text-brand">View reports →</Link></div><div className="h-56 rounded-xl bg-surface-2 border border-line p-4 flex items-end gap-3">{[34,48,42,67,53,74,61,82,70,91,76,88].map((h,i)=><div key={i} className="flex-1 h-full flex items-end"><div className="w-full rounded-t-md bg-brand/85 min-h-3" style={{height:`${h}%`}}/></div>)}</div><div className="flex justify-between text-[11px] text-muted mt-3"><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>Now</span></div></div>
   <div className="card p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-lg">Quick actions</h2><p className="text-xs text-muted mt-1">Common tasks for managers.</p></div></div><div className="space-y-2">{actions.slice(0,4).map(a=><Link href={a[2]} key={a[0]} className="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-brand/50 hover:bg-brand-soft/30"><div className="w-9 h-9 rounded-lg bg-panel flex items-center justify-center text-muted"><PosIcon name={a[3]} size={17}/></div><div className="min-w-0 flex-1"><div className="font-semibold text-sm">{a[0]}</div><div className="text-xs text-muted mt-0.5">{a[1]}</div></div><PosIcon name="arrow" size={15}/></Link>)}</div></div>
  </section>
  <section><div className="section-title mb-3">Management</div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">{actions.map(a=><Link href={a[2]} key={a[0]} className="card p-4 hover:border-brand/50 hover:-translate-y-px transition"><div className="w-9 h-9 rounded-lg bg-panel text-muted flex items-center justify-center mb-4"><PosIcon name={a[3]} size={17}/></div><div className="font-bold text-sm">{a[0]}</div><div className="text-xs text-muted mt-1 leading-5">{a[1]}</div></Link>)}</div></section>
 </div>
}
