"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPaisa } from "@/lib/money";
import { PosIcon } from "@/components/PosIcon";

interface RecentOrder { id:string; number:number; type:string; status:string; total:number; createdAt:string; waiterName:string|null; customerName:string|null; tableNumber:number|null; }
interface Stats { todaySalesPaisa:number; ordersToday:number; openOrders:number; avgTicketPaisa:number; hourlySales:{hour:number;amount:number}[]; recentOrders:RecentOrder[]; }

export default function AdminDashboard(){
 const [stats,setStats]=useState<Stats|null>(null); const [loading,setLoading]=useState(true); const [failed,setFailed]=useState(false);
 useEffect(()=>{fetch("/api/dashboard/stats",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(setStats).catch(()=>setFailed(true)).finally(()=>setLoading(false))},[]);
 const kpis=[
  {label:"Today's sales",value:stats?formatPaisa(stats.todaySalesPaisa):"—",hint:stats?`${stats.ordersToday} billed orders today`:"Live from billing",icon:"chart"},
  {label:"Orders today",value:stats?String(stats.ordersToday):"—",hint:"Completed bills",icon:"order"},
  {label:"Open orders",value:stats?String(stats.openOrders):"—",hint:"Held or unpaid",icon:"clock"},
  {label:"Average ticket",value:stats?formatPaisa(stats.avgTicketPaisa):"—",hint:"Per billed order",icon:"grid"},
 ];
 const actions=[
  ["Open POS","Start a new bill","/pos","order"],
  ["Manage menu","Categories, items & modifiers","/admin/menu","menu"],
  ["Orders","Find, review & reprint bills","/admin/orders","order"],
  ["Tables","Dining floor and table setup","/admin/tables","table"],
  ["Reports","Sales and payment insights","/admin/reports","chart"],
  ["Staff","Users, roles & permissions","/admin/users","users"],
 ] as const;
 const chart=useMemo(()=>{
   const src=stats?.hourlySales??[]; const business=src.filter(x=>x.hour>=9&&x.hour<=23); const max=Math.max(1,...business.map(x=>x.amount));
   return business.map(x=>({...x,pct:Math.max(x.amount>0?8:2,(x.amount/max)*100)}));
 },[stats]);
 return <div className="space-y-6 md:space-y-7">
  <div className="page-heading"><div><div className="section-title mb-2.5">Overview</div><h1 className="page-title">Today at a glance</h1><p className="page-subtitle">Live restaurant performance, open bills and the shortcuts you use most.</p></div><div className="flex gap-2"><Link href="/admin/reports" className="btn-secondary h-11">View reports</Link><Link href="/pos" className="btn-primary h-11 gap-2"><PosIcon name="plus" size={16}/> New order</Link></div></div>
  {failed?<div className="card p-4 border-danger/20 bg-danger-soft text-danger text-sm font-semibold">Dashboard data could not be loaded. Billing remains available from the POS.</div>:null}
  <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">{kpis.map(k=><div key={k.label} className="card p-5 md:p-5.5 relative overflow-hidden"><div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-brand-soft/70"/><div className="relative flex items-start justify-between"><div><div className="text-xs font-bold text-muted">{k.label}</div><div className="text-[28px] leading-none font-extrabold tracking-tight text-ink mt-3">{loading?"—":k.value}</div></div><div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center border border-brand/10"><PosIcon name={k.icon} size={18}/></div></div><div className="relative text-xs text-muted mt-4">{k.hint}</div></div>)}</section>
  <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_.9fr] gap-4">
   <div className="card p-5 md:p-6"><div className="flex items-start justify-between gap-3 mb-6"><div><div className="section-title mb-2">Sales rhythm</div><h2 className="font-extrabold text-lg text-ink">Hourly billed sales</h2><p className="text-xs text-muted mt-1">Actual revenue from today’s billed orders.</p></div><Link href="/admin/reports" className="text-xs font-extrabold text-brand hover:text-brand-dark">Full report →</Link></div><div className="h-56 flex items-end gap-1.5 md:gap-2.5">{chart.map((x,i)=><div key={x.hour} className="group flex-1 h-full flex flex-col justify-end items-center min-w-0"><div className="opacity-0 group-hover:opacity-100 transition text-[9px] font-bold text-muted mb-1 whitespace-nowrap">{x.amount?formatPaisa(x.amount):"—"}</div><div className="w-full rounded-t-lg bg-brand/80 group-hover:bg-brand transition min-h-[3px]" style={{height:`${x.pct}%`}}/><span className={`text-[9px] text-muted mt-2 ${i%3!==0?"hidden md:block md:opacity-0":""}`}>{x.hour>12?`${x.hour-12}p`:x.hour===12?"12p":`${x.hour}a`}</span></div>)}</div></div>
   <div className="card p-5 md:p-6"><div className="section-title mb-2">Quick actions</div><h2 className="font-extrabold text-lg text-ink mb-4">Run the floor</h2><div className="space-y-2.5">{actions.slice(0,4).map(a=><Link href={a[2]} key={a[0]} className="group flex items-center gap-3 p-3.5 rounded-xl border border-line hover:border-brand/30 hover:bg-brand-soft/35 transition"><div className="w-10 h-10 rounded-xl bg-surface-2 border border-line text-muted flex items-center justify-center group-hover:bg-white group-hover:text-brand"><PosIcon name={a[3]} size={17}/></div><div className="min-w-0 flex-1"><div className="font-bold text-sm text-ink">{a[0]}</div><div className="text-[11px] text-muted mt-0.5">{a[1]}</div></div><span className="text-muted group-hover:text-brand group-hover:translate-x-0.5 transition">→</span></Link>)}</div></div>
  </section>
  <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_.9fr] gap-4">
    <div className="card overflow-hidden"><div className="px-5 md:px-6 py-5 flex items-center justify-between border-b border-line"><div><div className="section-title mb-2">Activity</div><h2 className="font-extrabold text-lg text-ink">Recent orders</h2></div><Link href="/admin/orders" className="text-xs font-extrabold text-brand">View all →</Link></div>{!stats?.recentOrders?.length?<div className="p-8 text-sm text-muted text-center">No recent orders yet.</div>:<div className="divide-y divide-line">{stats.recentOrders.map(o=><Link href={`/bill/${o.id}`} key={o.id} className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-surface-2 transition"><div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-xs font-extrabold text-ink">#{o.number}</div><div className="min-w-0 flex-1"><div className="text-sm font-bold text-ink truncate">{o.customerName || (o.tableNumber?`Table T${o.tableNumber}`:o.type.replace("_"," "))}</div><div className="text-[11px] text-muted mt-0.5">{new Date(o.createdAt).toLocaleString()} {o.waiterName?`· ${o.waiterName}`:""}</div></div><div className="text-right"><div className="text-sm font-extrabold text-ink">{formatPaisa(o.total)}</div><div className={`text-[10px] font-bold mt-1 ${o.status==="OPEN"?"text-brand":o.status==="BILLED"?"text-success":"text-muted"}`}>{o.status}</div></div></Link>)}</div>}</div>
    <div><div className="section-title mb-3">Management</div><div className="grid grid-cols-2 gap-3">{actions.slice(4).concat(actions.slice(1,3)).map(a=><Link href={a[2]} key={a[0]} className="card p-4 group hover:border-brand/35 hover:-translate-y-0.5 transition"><div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-muted group-hover:text-brand flex items-center justify-center mb-4"><PosIcon name={a[3]} size={17}/></div><div className="font-extrabold text-sm text-ink">{a[0]}</div><div className="text-[11px] text-muted mt-1.5 leading-4">{a[1]}</div></Link>)}</div></div>
  </section>
 </div>
}
