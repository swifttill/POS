"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaisa } from "@/lib/money";
import { PosIcon } from "@/components/PosIcon";

interface OrderRow {
  id:string; number:number; type:string; status:string; subtotal:number; tax:number; total:number; discountPaisa:number; paid:number; createdAt:string;
  customerName:string|null; waiterName:string|null; paymentTender:string|null; tableNumber:number|null; tableName:string|null; itemCount:number; editable:boolean;
}
const ORDER_TYPES=["DINE_IN","TAKEAWAY","DELIVERY"] as const;
const STATUSES=["OPEN","BILLED","VOIDED","REFUNDED","CLOSED"] as const;
const statusLabel:Record<string,string>={OPEN:"Open",BILLED:"Billed",VOIDED:"Voided",REFUNDED:"Refunded",CLOSED:"Closed"};
const typeLabel:Record<string,string>={DINE_IN:"Dine in",TAKEAWAY:"Takeaway",DELIVERY:"Delivery"};

export function OrdersTable(){
 const router=useRouter();
 const [status,setStatus]=useState(""); const [type,setType]=useState(""); const [cashier,setCashier]=useState(""); const [search,setSearch]=useState("");
 const [rows,setRows]=useState<OrderRow[]|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{const qs=new URLSearchParams();if(status)qs.set("status",status);if(type)qs.set("type",type);if(cashier)qs.set("cashier",cashier);if(search.trim())qs.set("search",search.trim());const res=await fetch(`/api/orders?${qs}`,{cache:"no-store"});if(!res.ok)throw new Error(`Could not load orders (${res.status})`);const d=await res.json();setRows(d.orders??[])}catch(e){setError(e instanceof Error?e.message:"Network error while loading orders");setRows([])}finally{setLoading(false)}},[status,type,cashier,search]);
 useEffect(()=>{const t=window.setTimeout(load,search?250:0);return()=>window.clearTimeout(t)},[load,search]);
 const cashiers=useMemo(()=>Array.from(new Set((rows??[]).map(r=>r.waiterName).filter((n):n is string=>Boolean(n)))).sort(),[rows]);
 const activeFilters=[status,type,cashier,search.trim()].filter(Boolean).length;
 const reset=()=>{setStatus("");setType("");setCashier("");setSearch("")};
 const rowsData=rows??[];
 const statusStyle=(s:string)=>s==="OPEN"?"bg-brand-soft text-brand":s==="BILLED"?"bg-success-soft text-success":s==="VOIDED"?"bg-danger-soft text-danger":"bg-surface-2 text-muted";

 return <div className="space-y-4">
   <div className="card p-4 md:p-5">
     <div className="flex flex-col xl:flex-row xl:items-end gap-3">
       <label className="block flex-1 min-w-[220px]"><span className="section-title block mb-2">Search</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><PosIcon name="search" size={15}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Order number or customer name" className="input pl-9 h-11"/></div></label>
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:w-[620px]">
         <Filter label="Status" value={status} onChange={setStatus}><option value="">All statuses</option>{STATUSES.map(s=><option key={s} value={s}>{statusLabel[s]}</option>)}</Filter>
         <Filter label="Order type" value={type} onChange={setType}><option value="">All types</option>{ORDER_TYPES.map(t=><option key={t} value={t}>{typeLabel[t]}</option>)}</Filter>
         <Filter label="Cashier" value={cashier} onChange={setCashier}><option value="">All cashiers</option>{cashiers.map(c=><option key={c} value={c}>{c}</option>)}</Filter>
       </div>
       {activeFilters?<button onClick={reset} className="btn-secondary h-11 whitespace-nowrap">Clear {activeFilters}</button>:null}
     </div>
   </div>

   {error?<div className="card p-8 text-center"><div className="w-11 h-11 mx-auto rounded-xl bg-danger-soft text-danger flex items-center justify-center mb-3">!</div><p className="text-danger font-bold">{error}</p><p className="text-xs text-muted mt-1">Check the connection and try again.</p><button onClick={load} className="btn-secondary mt-4">Retry</button></div>:
   loading&&rows===null?<OrdersSkeleton/>:
   rowsData.length===0?<div className="card p-10 text-center"><div className="w-12 h-12 rounded-xl bg-surface-2 border border-line mx-auto flex items-center justify-center text-muted mb-3"><PosIcon name="order" size={21}/></div><div className="font-extrabold text-ink">No orders found</div><div className="text-sm text-muted mt-1">Try changing the current filters or create a new order in POS.</div>{activeFilters?<button onClick={reset} className="btn-secondary mt-4">Reset filters</button>:null}</div>:
   <div className="table-shell overflow-x-auto">
    <div className="px-4 md:px-5 py-3 border-b border-line bg-white flex items-center justify-between"><div className="text-sm font-bold text-ink">{rowsData.length} order{rowsData.length===1?"":"s"}</div><div className="text-xs text-muted">Newest first {loading?"· refreshing…":""}</div></div>
    <table className="data-table min-w-[1050px]"><thead><tr><th className="text-left">Order</th><th className="text-left">Customer</th><th className="text-left">Service</th><th className="text-left">Cashier</th><th className="text-right">Amount</th><th className="text-left">Payment</th><th className="text-left">Status</th><th className="text-right">Actions</th></tr></thead><tbody>
      {rowsData.map(order=><tr key={order.id}>
        <td><div className="font-extrabold text-ink">#{order.number}</div><div className="text-[11px] text-muted mt-1">{new Date(order.createdAt).toLocaleString()}</div></td>
        <td><div className="font-semibold text-ink">{order.customerName||"Walk-in"}</div><div className="text-[11px] text-muted mt-1">{order.itemCount} item{order.itemCount===1?"":"s"}</div></td>
        <td><div className="font-semibold">{typeLabel[order.type]??order.type}</div><div className="text-[11px] text-muted mt-1">{order.tableNumber?`${order.tableName?order.tableName+" · ":""}Table T${order.tableNumber}`:"No table"}</div></td>
        <td><span className="text-muted">{order.waiterName||"—"}</span></td>
        <td className="text-right"><div className="font-extrabold text-ink">{formatPaisa(order.total)}</div>{order.discountPaisa>0?<div className="text-[10px] text-danger mt-1">Discount {formatPaisa(order.discountPaisa)}</div>:null}</td>
        <td><span className="font-semibold">{order.paymentTender?order.paymentTender.replace("_"," "):"—"}</span>{order.paid>0&&order.paid<order.total?<div className="text-[10px] text-warn mt-1">Balance {formatPaisa(order.total-order.paid)}</div>:null}</td>
        <td><span className={`status-pill ${statusStyle(order.status)}`}>{statusLabel[order.status]??order.status}</span></td>
        <td><div className="flex justify-end gap-1.5"><button onClick={()=>router.push(`/bill/${order.id}`)} className="h-8 px-3 rounded-lg border border-line bg-white text-xs font-bold hover:bg-surface-2">View</button><button onClick={()=>window.open(`/orders/${order.id}/print`,"_blank")} className="h-8 px-3 rounded-lg border border-line bg-white text-xs font-bold hover:bg-surface-2">Print</button>{order.editable?<button onClick={()=>router.push(`/pos?orderId=${encodeURIComponent(order.id)}`)} className="h-8 px-3 rounded-lg bg-brand-soft text-brand text-xs font-extrabold hover:bg-brand hover:text-white transition">Open</button>:null}</div></td>
      </tr>)}
    </tbody></table>
   </div>}
 </div>
}

function Filter({label,value,onChange,children}:{label:string;value:string;onChange:(v:string)=>void;children:React.ReactNode}){return <label className="block"><span className="section-title block mb-2">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="input h-11">{children}</select></label>}
function OrdersSkeleton(){return <div className="table-shell p-5 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 rounded-xl bg-surface-2 animate-pulse"/>)}</div>}
