"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PosIcon } from "@/components/PosIcon";
import { OrderTypeTabs } from "@/components/OrderTypeTabs";
import { TableMap, type TableDTO } from "@/components/TableMap";
import { CategoryRail } from "@/components/CategoryRail";
import { MenuItemCard } from "@/components/MenuItemCard";
import { DealCard } from "@/components/DealCard";
import { ModifierModal } from "@/components/ModifierModal";
import { Cart } from "@/components/Cart";
import { PayModal, type PayResult } from "@/components/PayModal";
import ManagerPinModal from "@/components/ManagerPinModal";
import { SecurityLock } from "@/components/SecurityLock";
import { fetchMenu, createOrder } from "@/lib/api";
import { gstAmount, formatPaisa } from "@/lib/money";
import type { CartLine, CompanyDTO, DealDTO, MenuItemDTO, MenuResponse, OrderType } from "@/lib/types";

interface PendingOrder { id:string; type:string; status:string; subtotal:number; tax:number; total:number; paid:number; createdAt:string; tableNumber:number|null; tableName:string|null; itemCount:number; }

export default function FOHPage() {
  const router = useRouter();
  const [menu,setMenu]=useState<MenuResponse|null>(null);
  const [tables,setTables]=useState<TableDTO[]>([]);
  const [company,setCompany]=useState<CompanyDTO|null>(null);
  const [loading,setLoading]=useState(true);
  const [orderType,setOrderType]=useState<OrderType>("DINE_IN");
  const [tableId,setTableId]=useState<string|null>(null);
  const [pax,setPax]=useState<number|null>(null);
  const [waiter,setWaiter]=useState("");
  const [lockWaiter,setLockWaiter]=useState(false);
  const [customerName,setCustomerName]=useState("");
  const [customerPhone,setCustomerPhone]=useState("");
  const [customerAddress,setCustomerAddress]=useState("");
  const [activeCat,setActiveCat]=useState<string|null>(null);
  const [lines,setLines]=useState<CartLine[]>([]);
  const [modifierItem,setModifierItem]=useState<MenuItemDTO|null>(null);
  const [currentShiftId,setCurrentShiftId]=useState<string|null>(null);
  const [activeOrderId,setActiveOrderId]=useState<string|null>(null);
  const [pending,setPending]=useState<PendingOrder[]>([]);
  const [showPending,setShowPending]=useState(false);
  const [pendingVoidId,setPendingVoidId]=useState<string|null>(null);
  const [payOpen,setPayOpen]=useState(false);
  const [payExisting,setPayExisting]=useState<{orderId:string;existingPaid:number;subtotal:number;tax:number;total:number}|null>(null);
  const [editOrderId,setEditOrderId]=useState<string|null>(null);
  const [editLines,setEditLines]=useState<CartLine[]>([]);
  const [editOriginalIds,setEditOriginalIds]=useState<string[]>([]);
  const [editOriginal,setEditOriginal]=useState<Record<string,{quantity:number;notes:string}>>({});
  const [editMeta,setEditMeta]=useState<{type:string;tableNumber:number|null;paid:number;subtotal:number;tax:number;total:number}|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const currency=company?.currency??"PKR";
  const editing=!!editOrderId;

  useEffect(()=>{ fetch("/api/auth/me").then(r=>{if(r.status===401)router.replace("/login")}).catch(()=>{}); },[router]);
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get("orderId");if(id)openEdit(id)},[]);
  useEffect(()=>{
    Promise.all([
      fetchMenu().then(m=>{setMenu(m);setCompany(m.company);setActiveCat(m.categories[0]?.id??null)}),
      fetch("/api/tables").then(r=>r.json()).then(d=>setTables(d.tables??[])),
      fetch("/api/shifts").then(r=>r.json()).then(d=>setCurrentShiftId(d.shift?.id??null)),
    ]).catch(()=>{}).finally(()=>setLoading(false));
    loadPending();
  },[]);
  function showToast(msg:string){setToast(msg);window.setTimeout(()=>setToast(null),2600)}
  async function loadPending(){try{const r=await fetch("/api/orders?status=OPEN");const d=await r.json();setPending(d.orders??[])}catch{}}
  const occupiedAt=useMemo<Record<string,string>>(()=>{const out:Record<string,string>={};pending.filter(o=>o.type==="DINE_IN"&&o.tableNumber!=null).forEach(o=>{const t=tables.find(t=>t.number===o.tableNumber);if(t)out[t.id]=o.createdAt});return out},[pending,tables]);
  function handleTableSelect(id:string){const num=tables.find(t=>t.id===id)?.number;const existing=pending.find(o=>o.type==="DINE_IN"&&o.tableNumber===num&&o.status==="OPEN");if(existing){showToast(`Table T${num} already has an open order`);openEdit(existing.id);return}setTableId(id);}
  const subtotal=useMemo(()=>(editing?editLines:lines).reduce((s,l)=>s+(l.unitPrice+l.modifiers.reduce((m,x)=>m+x.priceDelta,0))*l.quantity,0),[editing?editLines:lines]);
  const tax=company?.gstEnabled?gstAmount(subtotal,company.gstRate):0;
  const total=subtotal+tax;
  const activeItems=menu?.categories.find(c=>c.id===activeCat)?.items??[];
  function addItem(item:MenuItemDTO){if(item.modifierGroups.length){setModifierItem(item);return}(editing?setEditLines:setLines)(p=>[...p,makeLine(item.id,item.name,item.price,item.printerStation,[])]);}
  function addDeal(deal:DealDTO){(editing?setEditLines:setLines)(p=>[...p,{lineId:uid(),menuItemId:"",name:deal.name,unitPrice:deal.type==="PERCENT"?0:deal.value,quantity:1,notes:deal.type==="PERCENT"?`${deal.value}% off order`:"",seat:null,station:"MAIN",modifiers:deal.items.map(i=>({id:i.id,name:`${i.quantity}× ${i.name}`,priceDelta:0}))}]);}
  function qty(id:string,d:number,setter:Dispatch<SetStateAction<CartLine[]>>){setter(p=>p.map(l=>l.lineId===id?{...l,quantity:l.quantity+d}:l).filter(l=>l.quantity>0))}
  const context={type:orderType,tableId:orderType==="DINE_IN"?tableId:null,pax:orderType==="DINE_IN"?pax:null,waiterName:waiter||null,customerName:orderType==="DELIVERY"?customerName||null:null,customerPhone:orderType==="DELIVERY"?customerPhone||null:null,customerAddress:orderType==="DELIVERY"?customerAddress||null:null};
  async function holdOrder(){if(!lines.length)return showToast("Add an item before holding the order");if(orderType==="DINE_IN"&&!tableId)return showToast("Select a table first");try{const o=await createOrder({...context,shiftId:currentShiftId,items:linesToItems(lines),payments:[],discountPaisa:0,discountReason:null});setActiveOrderId(o.id);setLines([]);setTableId(null);setPax(null);await loadPending();showToast("Order saved to open orders") }catch(e){showToast(e instanceof Error?e.message:"Could not save order")}}
  async function payNewOrder(result:PayResult){const o=await createOrder({...context,shiftId:currentShiftId,items:linesToItems(lines),payments:result.payments,discountPaisa:result.discountPaisa,discountReason:result.discountReason});setActiveOrderId(o.id);setLines([]);setTableId(null);setPax(null);setPayOpen(false);await loadPending();showToast("Payment completed");window.open(`/bill/${o.id}`,"_blank")}
  async function openEdit(id:string){try{const r=await fetch(`/api/orders/${id}`);const d=await r.json();const o=d.order;const loaded:CartLine[]=(o.items??[]).map((it:any)=>({lineId:it.id,menuItemId:it.menuItemId??"",name:it.name,unitPrice:it.unitPrice,quantity:it.quantity,notes:it.notes??"",seat:it.seat,station:it.station,modifiers:(it.modifiers??[]).map((m:any)=>({id:m.id,name:m.name,priceDelta:m.priceDelta}))}));setEditOrderId(id);setEditLines(loaded);setEditOriginalIds(loaded.map(l=>l.lineId));setEditOriginal(Object.fromEntries(loaded.map(l=>[l.lineId,{quantity:l.quantity,notes:l.notes}])));const paid=(o.payments??[]).reduce((s:number,p:any)=>s+p.amount,0);setEditMeta({type:o.type,tableNumber:o.table?.number??null,paid,subtotal:o.subtotal??0,tax:o.tax??0,total:o.total});setOrderType(o.type as OrderType);setTableId(o.table?.id??null);setPax(o.pax??null);setWaiter(o.waiterName??"");setCustomerName(o.customerName??"");setCustomerPhone(o.customerPhone??"");setCustomerAddress(o.customerAddress??"");setShowPending(false)}catch{showToast("Could not load order")}}
  async function sendUpdate(){if(!editOrderId)return;const original=new Set(editOriginalIds);const current=new Set(editLines.map(l=>l.lineId));const removed=editOriginalIds.filter(id=>!current.has(id));const added=editLines.filter(l=>!original.has(l.lineId));const updated=editLines.filter(l=>original.has(l.lineId)).filter(l=>editOriginal[l.lineId]&&(editOriginal[l.lineId].quantity!==l.quantity||editOriginal[l.lineId].notes!==l.notes)).map(l=>({id:l.lineId,quantity:l.quantity,notes:l.notes}));try{const res=await fetch(`/api/orders/${editOrderId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({addItems:added.length?linesToItems(added):undefined,updateItems:updated.length?updated:undefined,removeItemIds:removed.length?removed:undefined})});if(!res.ok){const d=await res.json().catch(()=>({}));showToast(d?.error??`Error updating order (${res.status})`);return}showToast("Order updated");setEditOrderId(null);setEditLines([]);await loadPending()}catch{showToast("Could not update order")}}
  async function submitEditPayment(result:PayResult){if(!payExisting)return;try{const res=await fetch(`/api/orders/${payExisting.orderId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({payments:result.payments,discountPaisa:result.discountPaisa,discountReason:result.discountReason})});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d?.error??`Error recording payment (${res.status})`)}setPayOpen(false);setPayExisting(null);setEditOrderId(null);setEditLines([]);await loadPending();showToast("Payment recorded");window.open(`/bill/${payExisting.orderId}`,"_blank")}catch(e){throw e}}
  async function voidOrder(id:string,pin?:string){try{const res=await fetch(`/api/orders/${id}/void`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:pin??null})});if(!res.ok){const d=await res.json().catch(()=>({}));showToast(d?.error??`Could not void order (${res.status})`);return}setPendingVoidId(null);await loadPending();showToast("Order voided")}catch{showToast("Could not void order")}}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login")}

  if(loading)return <main className="h-screen flex items-center justify-center bg-background"><div className="text-sm text-muted">Loading SwiftTill…</div></main>;

  return <SecurityLock timeoutMinutes={5}><div className="h-screen flex flex-col bg-background overflow-hidden">
    <header className="h-[72px] shrink-0 bg-white/95 backdrop-blur border-b border-line flex items-center justify-between px-4 md:px-5 shadow-[0_1px_0_rgba(17,24,39,.02)]">
      <div className="flex items-center gap-5 min-w-0"><Logo size={38} variant="mark"/><div className="hidden sm:block"><div className="font-bold text-[17px] leading-5">SwiftTill</div><div className="text-[11px] text-muted">Restaurant POS</div></div><div className="h-7 w-px bg-line hidden md:block"/><div className="text-sm font-semibold text-muted hidden md:block">Billing</div></div>
      <div className="flex items-center gap-2"><div className="hidden xl:flex items-center gap-2 text-xs text-muted mr-2"><span className="inline-block w-2 h-2 rounded-full bg-success"/> Shift active</div><button onClick={()=>{loadPending();setShowPending(true)}} className="h-9 px-3 rounded-lg border border-line bg-white flex items-center gap-2 text-sm font-semibold hover:bg-surface-2"><PosIcon name="order" size={16}/> Open orders <span className="text-xs text-muted">{pending.length}</span></button><button onClick={()=>router.replace("/admin")} className="h-9 w-9 rounded-lg border border-line flex items-center justify-center hover:bg-surface-2" title="Back office"><PosIcon name="settings" size={17}/></button><button onClick={logout} className="h-9 px-3 rounded-lg border border-line text-sm font-semibold hover:bg-surface-2 hidden sm:block">Logout</button></div>
    </header>

    <main className="flex-1 min-h-0 grid grid-cols-1 overflow-y-auto md:grid-cols-[252px_minmax(0,1fr)_372px] md:overflow-hidden gap-4 p-3 md:p-4">
      <aside className="min-h-0 flex flex-col gap-3 overflow-y-auto pos-scroll">
        <section className="card p-3"><div className="section-title mb-2">Order type</div><OrderTypeTabs value={orderType} onChange={v=>{setOrderType(v);if(v!=="DINE_IN"){setTableId(null);setPax(null)}if(v!=="DELIVERY"){setCustomerName("");setCustomerPhone("");setCustomerAddress("")}}}/></section>
        {orderType==="DINE_IN"?<section className="card p-3"><div className="flex items-center justify-between mb-3"><div><div className="section-title">Tables</div><div className="text-xs text-muted mt-1">Select a table for this bill</div></div>{tableId?<span className="text-xs font-semibold text-brand">Selected</span>:null}</div><TableMap tables={tables} selectedId={tableId} occupiedAt={occupiedAt} onSelect={handleTableSelect}/><div className="mt-3"><label className="text-xs text-muted">Guests</label><input type="number" min={1} value={pax??""} onChange={e=>setPax(e.target.value?Number(e.target.value):null)} className="input mt-1" placeholder="Optional"/></div></section>:null}
        {orderType==="DELIVERY"?<section className="card p-3"><div className="section-title mb-3">Customer details</div><div className="space-y-2"><Field label="Name" value={customerName} onChange={setCustomerName}/><Field label="Phone" value={customerPhone} onChange={setCustomerPhone}/><label className="block text-xs text-muted">Address<textarea value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} rows={3} className="input mt-1 resize-none" placeholder="Delivery address"/></label></div></section>:null}
        <section className="card p-3"><div className="section-title mb-3">Cashier</div><label className="text-xs text-muted">Waiter / cashier name<input value={waiter} disabled={lockWaiter} onChange={e=>setWaiter(e.target.value)} className="input mt-1 disabled:bg-panel" placeholder="Enter name"/></label><button onClick={()=>setLockWaiter(v=>!v)} className="mt-2 text-xs text-muted flex items-center gap-2 hover:text-text"><PosIcon name="lock" size={14}/>{lockWaiter?"Name locked":"Lock name for shift"}</button></section>
      </aside>

      <section className="min-w-0 min-h-0 flex flex-col bg-transparent">
        <div className="flex items-center justify-between gap-3 mb-3"><div className="min-w-0"><h1 className="text-xl font-bold text-ink">{editing?"Edit open order":"Menu"}</h1><p className="text-xs text-muted mt-0.5">{editing?`Order ${editOrderId?.slice(0,8)}`:"Tap a menu item to add it to the bill"}</p></div><div className="relative w-56 hidden md:block"><PosIcon name="search" size={15}/><input className="input pl-8 h-10" placeholder="Search menu…" onChange={e=>{const q=e.target.value.toLowerCase(); if(q) setActiveCat(menu?.categories.find(c=>c.items.some(i=>i.name.toLowerCase().includes(q)))?.id??activeCat)}}/></div></div>
        <CategoryRail categories={menu?.categories??[]} activeId={activeCat} onSelect={setActiveCat} showDeals={!!menu?.deals.length} dealsActive={activeCat==="deals"} onSelectDeals={()=>setActiveCat("deals")}/>
        <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1 pos-scroll"><div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 pb-4">{activeCat==="deals"?(menu?.deals??[]).map(d=><DealCard key={d.id} deal={d} currency={currency} onAdd={addDeal}/>):activeItems.map(item=><MenuItemCard key={item.id} item={item} onClick={addItem}/>)}</div>{!activeItems.length&&activeCat!=="deals"?<div className="card p-10 text-center text-sm text-muted">No menu items in this category.</div>:null}</div>
      </section>

      <aside className="min-h-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_12px_32px_rgba(17,24,39,.06)]">
        <div className="px-4 py-3 border-b border-line"><div className="flex items-center justify-between"><div><div className="font-bold">Current bill</div><div className="text-[11px] text-muted mt-0.5">{editing?"Editing open order":"New order"}</div></div><span className="text-xs font-semibold px-2 py-1 rounded-md bg-brand-soft text-brand">{orderType.replace("_"," ")}</span></div>{(tableId||customerName)?<div className="flex gap-2 mt-3 text-xs text-muted"><span>{tableId?`Table T${tables.find(t=>t.id===tableId)?.number??""}`:customerName}</span>{pax?<span>• {pax} guests</span>:null}</div>:null}</div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 pos-scroll"><Cart lines={editing?editLines:lines} currency={currency} onQty={(id,d)=>qty(id,d,editing?setEditLines:setLines)} onRemove={id=>(editing?setEditLines:setLines)(p=>p.filter(l=>l.lineId!==id))}/></div>
        <div className="border-t border-line p-4 bg-surface-2"><div className="space-y-2 text-sm"><div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatPaisa(subtotal,currency)}</span></div>{company?.gstEnabled?<div className="flex justify-between text-muted"><span>GST {company.gstRate}%</span><span>{formatPaisa(tax,currency)}</span></div>:null}<div className="pt-2 mt-1 border-t border-line flex justify-between items-end"><span className="font-bold">Total</span><span className="text-2xl font-extrabold text-brand">{formatPaisa(total,currency)}</span></div></div>
          {!editing?<div className="grid grid-cols-2 gap-2 mt-4"><button onClick={holdOrder} disabled={!lines.length} className="btn-secondary">Hold order</button><button onClick={()=>setPayOpen(true)} disabled={!lines.length} className="btn-primary">Take payment</button></div>:<div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>{setEditOrderId(null);setEditLines([])}} className="btn-secondary">Cancel edit</button><button onClick={sendUpdate} disabled={!editLines.length} className="btn-primary">Save changes</button></div>}
          {editing?<button onClick={()=>setPayExisting({orderId:editOrderId!,existingPaid:editMeta?.paid??0,subtotal,tax,total})} className="w-full mt-2 h-10 rounded-lg border border-brand/30 bg-brand-soft text-brand font-bold text-sm">Record payment</button>:activeOrderId?<button onClick={()=>window.open(`/bill/${activeOrderId}`,"_blank")} className="w-full mt-2 h-9 text-xs font-semibold text-muted hover:text-brand flex items-center justify-center gap-2"><PosIcon name="print" size={14}/> Reprint last receipt</button>:null}
        </div>
      </aside>
    </main>

    {modifierItem?<ModifierModal item={modifierItem} defaultSeat={null} onConfirm={line=>{(editing?setEditLines:setLines)(p=>[...p,line]);setModifierItem(null)}} onCancel={()=>setModifierItem(null)}/>:null}
    {payOpen?<PayModal currency={currency} subtotal={subtotal} tax={tax} total={total} gstEnabled={!!company?.gstEnabled} gstRate={company?.gstRate??0} title="Take payment" onClose={()=>setPayOpen(false)} onSubmit={payNewOrder}/>:null}
    {payExisting?<PayModal currency={currency} subtotal={payExisting.subtotal} tax={payExisting.tax} total={payExisting.total} gstEnabled={!!company?.gstEnabled} gstRate={company?.gstRate??0} existingPaid={payExisting.existingPaid} title="Record payment" onClose={()=>setPayExisting(null)} onSubmit={submitEditPayment}/>:null}
    {showPending?<PendingModal orders={pending} currency={currency} onClose={()=>setShowPending(false)} onEdit={openEdit} onPay={o=>setPayExisting({orderId:o.id,existingPaid:o.paid,subtotal:o.subtotal,tax:o.tax,total:o.total})} onVoid={setPendingVoidId} onPrint={id=>window.open(`/bill/${id}`,"_blank")}/>:null}
    {pendingVoidId?<ManagerPinModal title="Void order" confirmLabel="Void" onSuccess={(pin)=>voidOrder(pendingVoidId,pin)} onClose={()=>setPendingVoidId(null)}/>:null}
    {toast?<div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] bg-ink text-white rounded-lg px-4 py-3 shadow-lg text-sm font-semibold">{toast}</div>:null}
  </div></SecurityLock>;
}

function makeLine(menuItemId:string,name:string,unitPrice:number,station:CartLine["station"],modifiers:CartLine["modifiers"]):CartLine{return{lineId:uid(),menuItemId,name,unitPrice,quantity:1,notes:"",seat:null,station,modifiers}}
function uid(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}
function linesToItems(lines:CartLine[]){return lines.map(l=>({menuItemId:l.menuItemId||undefined,name:l.menuItemId?undefined:l.name,unitPrice:l.menuItemId?undefined:l.unitPrice,station:l.station,quantity:l.quantity,notes:l.notes||null,seat:l.seat??null,modifiers:l.modifiers.map(m=>({name:m.name,priceDelta:m.priceDelta}))}))}
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="block text-xs text-muted">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="input mt-1"/></label>}

function PendingModal({orders,currency,onClose,onEdit,onPay,onVoid,onPrint}:{orders:PendingOrder[];currency:string;onClose:()=>void;onEdit:(id:string)=>void;onPay:(o:PendingOrder)=>void;onVoid:(id:string)=>void;onPrint:(id:string)=>void}){return <div className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white border border-line rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl"><div className="px-5 py-4 border-b border-line flex items-center justify-between"><div><h2 className="text-lg font-bold">Open orders</h2><p className="text-xs text-muted mt-0.5">Held and unpaid bills waiting for action.</p></div><button onClick={onClose} className="w-9 h-9 rounded-lg border border-line text-muted hover:bg-surface-2">×</button></div><div className="p-4 overflow-y-auto max-h-[70vh]">{!orders.length?<div className="py-14 text-center text-sm text-muted">No open orders right now.</div>:<div className="space-y-2">{orders.map(o=><div key={o.id} className="border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand/40"><div><div className="font-bold">{o.type==="DINE_IN"&&o.tableNumber?`Table T${o.tableNumber}`:o.type.replace("_"," ")}</div><div className="text-xs text-muted mt-1">{o.itemCount} items · {formatPaisa(o.total,currency)} · {new Date(o.createdAt).toLocaleString()}</div></div><div className="flex flex-wrap gap-2"><button onClick={()=>onPrint(o.id)} className="btn-secondary text-xs py-2">Receipt</button><button onClick={()=>onEdit(o.id)} className="btn-secondary text-xs py-2">Edit</button><button onClick={()=>onPay(o)} className="btn-primary text-xs py-2">Pay</button><button onClick={()=>onVoid(o.id)} className="btn-danger text-xs py-2">Void</button></div></div>)}</div>}</div></div></div>}
