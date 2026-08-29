"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { OrderTypeTabs } from "@/components/OrderTypeTabs";
import { TableMap, type TableDTO } from "@/components/TableMap";
import { CategoryRail } from "@/components/CategoryRail";
import { MenuItemCard } from "@/components/MenuItemCard";
import { DealCard } from "@/components/DealCard";
import { ModifierModal } from "@/components/ModifierModal";
import { Cart } from "@/components/Cart";
import { PayModal, type PayResult } from "@/components/PayModal";
import ManagerPinModal from "@/components/ManagerPinModal";
import { fetchMenu, createOrder } from "@/lib/api";
import {
  enqueue,
  getQueue,
  removeFromQueue,
  queueCount,
} from "@/lib/offlineQueue";
import { gstAmount, formatPaisa } from "@/lib/money";
import type {
  CartLine,
  CompanyDTO,
  DealDTO,
  MenuItemDTO,
  MenuResponse,
  OrderType,
} from "@/lib/types";

interface PendingOrder {
  id: string;
  type: string;
  status: string;
  total: number;
  paid: number;
  createdAt: string;
  tableNumber: number | null;
  tableName: string | null;
  itemCount: number;
}

export default function FOHPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) router.replace("/login");
      })
      .catch(() => {});
  }, [router]);

  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const currency = company?.currency ?? "PKR";

  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableId, setTableId] = useState<string | null>(null);
  const [pax, setPax] = useState<number | null>(null);
  const [waiter, setWaiter] = useState("");
  const [lockWaiter, setLockWaiter] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [modifierItem, setModifierItem] = useState<MenuItemDTO | null>(null);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const [showPending, setShowPending] = useState(false);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [pendingVoidId, setPendingVoidId] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payExisting, setPayExisting] = useState<{
    orderId: string;
    existingPaid: number;
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);

  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editLines, setEditLines] = useState<CartLine[]>([]);
  const [editOriginalIds, setEditOriginalIds] = useState<string[]>([]);
  const [editOriginal, setEditOriginal] = useState<Record<string, { quantity: number; notes: string }>>({});
  const [editMeta, setEditMeta] = useState<{
    type: string;
    tableNumber: number | null;
    paid: number;
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function loadPending() {
    try {
      const res = await fetch("/api/orders?status=OPEN");
      const data = await res.json();
      setPending(data.orders ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    fetchMenu()
      .then((m) => {
        setMenu(m);
        setCompany(m.company);
        setActiveCat(m.categories[0]?.id ?? "deals");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables ?? []))
      .catch(() => {});
    fetch("/api/shifts")
      .then((r) => r.json())
      .then((d) => setCurrentShiftId(d.shift?.id ?? null))
      .catch(() => {});
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const occupiedTableIds = useMemo(
    () => new Set(pending.filter((o) => o.tableNumber != null && o.type === "DINE_IN").map((o) => tables.find((t) => t.number === o.tableNumber)?.id).filter(Boolean) as string[]),
    [pending, tables]
  );

  const subtotal = useMemo(
    () =>
      lines.reduce((s, l) => {
        const modTotal = l.modifiers.reduce((m, x) => m + x.priceDelta, 0);
        return s + (l.unitPrice + modTotal) * l.quantity;
      }, 0),
    [lines]
  );
  const tax = company?.gstEnabled ? gstAmount(subtotal, company.gstRate) : 0;
  const total = subtotal + tax;

  function addItem(item: MenuItemDTO) {
    const target = editOrderId ? setEditLines : setLines;
    if (item.modifierGroups.length > 0) {
      setModifierItem(item);
      return;
    }
    target((prev) => [
      ...prev,
      makeLine(item.id, item.name, item.price, item.printerStation, []),
    ]);
  }

  function addDeal(deal: DealDTO) {
    const target = editOrderId ? setEditLines : setLines;
    target((prev) => [
      ...prev,
      {
        lineId: uid(),
        menuItemId: "",
        name: deal.name,
        unitPrice: deal.value,
        quantity: 1,
        notes: "",
        seat: null,
        station: "MAIN",
        modifiers: deal.items.map((i) => ({ id: i.id, name: i.name, priceDelta: 0 })),
      },
    ]);
  }

  function onQty(setter: typeof setLines, lineId: string, delta: number) {
    setter((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }
  function onRemove(setter: typeof setLines, lineId: string) {
    setter((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  const checkoutContext = {
    type: orderType,
    tableId: orderType === "DINE_IN" ? tableId : null,
    pax: orderType === "DINE_IN" ? pax : null,
    waiterName: waiter || null,
    customerName: orderType === "DELIVERY" ? customerName || null : null,
    customerPhone: orderType === "DELIVERY" ? customerPhone || null : null,
    customerAddress: orderType === "DELIVERY" ? customerAddress || null : null,
  };

  async function sendToKitchen(): Promise<string | null> {
    if (lines.length === 0) return null;
    if (orderType === "DINE_IN" && !tableId) {
      showToast("Select a table first");
      return null;
    }
    try {
      const order = await createOrder({
        ...checkoutContext,
        shiftId: currentShiftId,
        items: linesToItems(lines),
        payments: [],
        discountPaisa: 0,
        discountReason: null,
      });
      showToast("Order held — sent to kitchen");
      setActiveOrderId(order.id);
      setLines([]);
      setTableId(null);
      setPax(null);
      loadPending();
      window.open(`/kot/${order.id}`, "_blank");
      return order.id;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send order");
      return null;
    }
  }

  function printBill() {
    if (editing && editOrderId) {
      window.open(`/bill/${editOrderId}`, "_blank");
      return;
    }
    if (activeOrderId) {
      window.open(`/bill/${activeOrderId}`, "_blank");
      return;
    }
    if (lines.length) {
      sendToKitchen().then((id) => {
        if (id) window.open(`/bill/${id}`, "_blank");
      });
    } else {
      showToast("No order to print");
    }
  }

  async function payNewOrder(result: PayResult) {
    try {
      const order = await createOrder({
        ...checkoutContext,
        shiftId: currentShiftId,
        items: linesToItems(lines),
        payments: result.payments,
        discountPaisa: result.discountPaisa,
        discountReason: result.discountReason,
      });
      showToast("Order paid");
      setActiveOrderId(order.id);
      setLines([]);
      setTableId(null);
      setPax(null);
      setPayOpen(false);
      loadPending();
      window.open(`/bill/${order.id}`, "_blank");
    } catch (e) {
      throw e;
    }
  }

  async function openEdit(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      const o = data.order;
      const loaded: CartLine[] = (o.items ?? []).map((it: any) => ({
        lineId: it.id,
        menuItemId: it.menuItemId ?? "",
        name: it.name,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        notes: it.notes ?? "",
        seat: it.seat,
        station: it.station,
        modifiers: (it.modifiers ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          priceDelta: m.priceDelta,
        })),
      }));
      setEditOrderId(id);
      setEditLines(loaded);
      setEditOriginalIds(loaded.map((l) => l.lineId));
      setEditOriginal(
        Object.fromEntries(loaded.map((l) => [l.lineId, { quantity: l.quantity, notes: l.notes }]))
      );
      const paid = (o.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
      setEditMeta({
        type: o.type,
        tableNumber: o.table?.number ?? null,
        paid,
        subtotal: o.subtotal ?? 0,
        tax: o.tax ?? 0,
        total: o.total,
      });
      setShowPending(false);
    } catch {
      showToast("Failed to load order");
    }
  }

  async function sendUpdate() {
    if (!editOrderId) return;
    const originalSet = new Set(editOriginalIds);
    const currentIds = new Set(editLines.map((l) => l.lineId));
    const removed = editOriginalIds.filter((id) => !currentIds.has(id));
    const added = editLines.filter((l) => !originalSet.has(l.lineId));
    const updated = editLines
      .filter((l) => originalSet.has(l.lineId))
      .filter(
        (l) =>
          editOriginal[l.lineId] &&
          (editOriginal[l.lineId].quantity !== l.quantity ||
            editOriginal[l.lineId].notes !== l.notes)
      )
      .map((l) => ({ id: l.lineId, quantity: l.quantity, notes: l.notes }));

    try {
      await fetch(`/api/orders/${editOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addItems: added.length ? linesToItems(added) : undefined,
          updateItems: updated.length ? updated : undefined,
          removeItemIds: removed.length ? removed : undefined,
        }),
      });
      showToast("Order updated & KOT re-sent");
      setEditOrderId(null);
      setEditLines([]);
      loadPending();
      window.open(`/kot/${editOrderId}`, "_blank");
    } catch {
      showToast("Failed to update order");
    }
  }

  async function submitEditPayment(result: PayResult) {
    if (!payExisting) return;
    try {
      await fetch(`/api/orders/${payExisting.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: result.payments,
          discountPaisa: result.discountPaisa,
          discountReason: result.discountReason,
        }),
      });
      showToast("Payment recorded");
      setPayOpen(false);
      setPayExisting(null);
      if (editOrderId) {
        setEditOrderId(null);
        setEditLines([]);
      }
      loadPending();
    } catch (e) {
      throw e;
    }
  }

  async function voidOrder(id: string) {
    try {
      await fetch(`/api/orders/${id}/void`, { method: "POST" });
      setPendingVoidId(null);
      loadPending();
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading SwiftTill…</div>
      </main>
    );
  }

  const activeItems: MenuItemDTO[] =
    menu?.categories.find((c) => c.id === activeCat)?.items ?? [];
  const editing = editOrderId != null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="h-screen flex">
      <aside className="w-56 shrink-0 border-r border-line bg-surface flex flex-col">
          <div className="h-14 px-4 flex items-center border-b border-line">
            <Logo />
          </div>
        <nav className="p-3 space-y-1 text-sm">
          <button
            onClick={() => router.replace("/pos")}
            className="w-full text-left px-3 py-2 rounded-lg bg-brand-soft text-brand font-medium"
          >
            POS
          </button>
          <button
            onClick={() => {
              loadPending();
              setShowPending(true);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-panel-2 flex items-center justify-between"
          >
            Orders
            {pending.length ? (
              <span className="text-[10px] bg-brand text-white rounded-full px-1.5">
                {pending.length}
              </span>
            ) : null}
          </button>
          <a href="/admin" className="block px-3 py-2 rounded-lg hover:bg-panel-2">
            Admin
          </a>
          <a href="/admin/tables" className="block px-3 py-2 rounded-lg hover:bg-panel-2">
            Tables
          </a>
          <a href="/admin/users" className="block px-3 py-2 rounded-lg hover:bg-panel-2">
            Users
          </a>
          <a href="/admin/reports" className="block px-3 py-2 rounded-lg hover:bg-panel-2">
            Reports
          </a>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-panel-2 text-danger"
          >
            Logout
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="font-semibold text-ink">SwiftTill POS</span>
          <div className="flex items-center gap-3">
            <input
              value={waiter}
              disabled={lockWaiter}
              onChange={(e) => setWaiter(e.target.value)}
              placeholder="Waiter name"
              className="input w-44 px-3 py-1.5 text-sm disabled:opacity-50"
            />
            <button
              onClick={() => setLockWaiter((v) => !v)}
              className={`text-xs px-2 py-1.5 rounded-lg border border-line ${
                lockWaiter ? "text-success" : "text-muted"
              }`}
              title="Lock waiter"
            >
              {lockWaiter ? "🔒" : "🔓"}
            </button>
            {!editing ? (
              <button
                onClick={() => {
                  loadPending();
                  setShowPending(true);
                }}
                className="text-sm px-3 py-1.5 rounded-lg border border-line hover:border-brand/50"
              >
                Orders ({pending.length})
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3">
          {/* Left: order context or edit summary */}
          <section className="col-span-12 lg:col-span-3 card p-3 overflow-y-auto">
            {editing ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Editing Order</h3>
                  <button
                    onClick={() => {
                      setEditOrderId(null);
                      setEditLines([]);
                    }}
                    className="text-xs text-muted hover:text-text"
                  >
                    ← Back
                  </button>
                </div>
                <div className="text-sm text-muted mb-1">
                  {editMeta?.type} {editMeta?.tableNumber ? `· T${editMeta.tableNumber}` : ""}
                </div>
                <div className="text-sm text-muted mb-3">
                  Paid {formatPaisa(editMeta?.paid ?? 0, currency)} /{" "}
                  {formatPaisa(editMeta?.total ?? 0, currency)}
                </div>
              </div>
            ) : (
              <>
                <OrderTypeTabs value={orderType} onChange={setOrderType} />
                {orderType === "DINE_IN" ? (
                  <div className="mt-3">
                    <div className="section-title mb-2">Tables</div>
                    <TableMap
                      tables={tables}
                      selectedId={tableId}
                      occupiedIds={Array.from(occupiedTableIds)}
                      onSelect={setTableId}
                    />
                    <label className="block mt-3 text-sm">
                      <span className="text-muted">Pax (guests)</span>
                      <input
                        type="number"
                        min={1}
                        value={pax ?? ""}
                        onChange={(e) =>
                          setPax(e.target.value ? Number(e.target.value) : null)
                        }
                        className="input mt-1 w-full px-3 py-2"
                      />
                    </label>
                  </div>
                ) : null}
                {orderType === "DELIVERY" ? (
                  <div className="mt-3 space-y-2">
                    <Field label="Customer" value={customerName} onChange={setCustomerName} />
                    <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} />
                    <label className="block text-sm">
                      <span className="text-muted">Address</span>
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        rows={2}
                        className="input mt-1 w-full px-3 py-2"
                      />
                    </label>
                  </div>
                ) : null}
                {orderType === "TAKEAWAY" ? (
                  <div className="mt-3 text-sm text-muted">
                    Quick counter sale — send to kitchen, pay at pickup.
                  </div>
                ) : null}
              </>
            )}
          </section>

          {/* Center: menu */}
          <section className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
            {!editing ? (
              <>
                <CategoryRail
                  categories={menu?.categories ?? []}
                  activeId={activeCat}
                  onSelect={setActiveCat}
                  showDeals={!!menu?.deals.length}
                  dealsActive={activeCat === "deals"}
                  onSelectDeals={() => setActiveCat("deals")}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 overflow-y-auto pr-1 pb-3">
                  {activeCat === "deals"
                    ? (menu?.deals ?? []).map((deal) => (
                        <DealCard key={deal.id} deal={deal} currency={currency} onAdd={addDeal} />
                      ))
                    : activeItems.map((item) => (
                        <MenuItemCard key={item.id} item={item} onClick={addItem} />
                      ))}
                </div>
              </>
            ) : (
              <div className="card p-4 text-center text-muted">
                Tap menu items on the left to add more, or adjust quantities in the
                order panel.
              </div>
            )}
          </section>

          {/* Right: cart / order lines */}
          <aside className="col-span-12 lg:col-span-3 card p-3 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto -mr-2 pr-2">
              <Cart
                lines={editing ? editLines : lines}
                currency={currency}
                onQty={(id, d) =>
                  onQty(editing ? setEditLines : setLines, id, d)
                }
                onRemove={(id) => onRemove(editing ? setEditLines : setLines, id)}
              />
            </div>
            <div className="border-t border-line pt-3 mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>
                  {formatPaisa(editing ? editMeta?.total ?? 0 : subtotal, currency)}
                </span>
              </div>
              {!editing && company?.gstEnabled ? (
                <div className="flex justify-between text-muted">
                  <span>GST {company.gstRate}%</span>
                  <span>{formatPaisa(tax, currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-base">
                <span>{editing ? "Order Total" : "Total"}</span>
                <span className="glow-text">
                  {formatPaisa(editing ? editMeta?.total ?? 0 : total, currency)}
                </span>
              </div>

              {!editing ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={sendToKitchen}
                    disabled={lines.length === 0}
                    className="btn-secondary py-3 disabled:opacity-40"
                  >
                    Hold
                  </button>
                  <button
                    onClick={printBill}
                    disabled={lines.length === 0 && !activeOrderId}
                    className="btn-secondary py-3 disabled:opacity-40"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setPayOpen(true)}
                    disabled={lines.length === 0}
                    className="btn-primary py-3 disabled:opacity-40"
                  >
                    Payment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={sendUpdate}
                    disabled={editLines.length === 0}
                    className="btn-secondary py-3 disabled:opacity-40"
                  >
                    Send Update
                  </button>
                  <button
                    onClick={printBill}
                    className="btn-secondary py-3"
                  >
                    Print
                  </button>
                  <button
                    onClick={() =>
                      setPayExisting({
                        orderId: editOrderId!,
                        existingPaid: editMeta?.paid ?? 0,
                        subtotal: editMeta?.subtotal ?? 0,
                        tax: editMeta?.tax ?? 0,
                        total: editMeta?.total ?? 0,
                      })
                    }
                    className="btn-primary py-3"
                  >
                    Payment
                  </button>
                </div>
              )}
            </div>
          </aside>
        </main>

        {modifierItem ? (
          <ModifierModal
            item={modifierItem}
            defaultSeat={null}
            onConfirm={(line) => {
              const target = editOrderId ? setEditLines : setLines;
              target((prev) => [...prev, line]);
              setModifierItem(null);
            }}
            onCancel={() => setModifierItem(null)}
          />
        ) : null}

        {payOpen ? (
          <PayModal
            currency={currency}
            subtotal={subtotal}
            tax={tax}
            total={total}
            gstEnabled={!!company?.gstEnabled}
            gstRate={company?.gstRate ?? 0}
            title="Take Payment"
            onClose={() => setPayOpen(false)}
            onSubmit={payNewOrder}
          />
        ) : null}

        {payExisting ? (
          <PayModal
            currency={currency}
            subtotal={payExisting.subtotal}
            tax={payExisting.tax}
            total={payExisting.total}
            gstEnabled={!!company?.gstEnabled}
            gstRate={company?.gstRate ?? 0}
            existingPaid={payExisting.existingPaid}
            title="Record Payment"
            onClose={() => setPayExisting(null)}
            onSubmit={submitEditPayment}
          />
        ) : null}

        {showPending ? (
          <PendingModal
            orders={pending}
            currency={currency}
            onClose={() => setShowPending(false)}
            onEdit={openEdit}
            onPay={(o) =>
              setPayExisting({
                orderId: o.id,
                existingPaid: o.paid,
                subtotal: o.total,
                tax: 0,
                total: o.total,
              })
            }
            onVoid={(id) => setPendingVoidId(id)}
            onPrint={(id) => window.open(`/bill/${id}`, "_blank")}
          />
        ) : null}

        {pendingVoidId ? (
          <ManagerPinModal
            title="Void order"
            confirmLabel="Void"
            onSuccess={() => voidOrder(pendingVoidId)}
            onClose={() => setPendingVoidId(null)}
          />
        ) : null}

        {toast ? (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] card glow-border px-5 py-3 text-sm">
            {toast}
          </div>
        ) : null}
      </div>
    </div>

function makeLine(
  menuItemId: string,
  name: string,
  unitPrice: number,
  station: CartLine["station"],
  modifiers: CartLine["modifiers"]
): CartLine {
  return {
    lineId: uid(),
    menuItemId,
    name,
    unitPrice,
    quantity: 1,
    notes: "",
    seat: null,
    station,
    modifiers,
  };
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function linesToItems(lines: CartLine[]) {
  return lines.map((l) => ({
    menuItemId: l.menuItemId || undefined,
    name: l.menuItemId ? undefined : l.name,
    unitPrice: l.menuItemId ? undefined : l.unitPrice,
    station: l.station,
    quantity: l.quantity,
    notes: l.notes || null,
    seat: l.seat ?? null,
    modifiers: l.modifiers.map((m) => ({ name: m.name, priceDelta: m.priceDelta })),
  }));
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1 w-full px-3 py-2"
      />
    </label>
  );
}

function PendingModal({
  orders,
  currency,
  onClose,
  onEdit,
  onPay,
  onVoid,
  onPrint,
}: {
  orders: PendingOrder[];
  currency: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onPay: (o: PendingOrder) => void;
  onVoid: (id: string) => void;
  onPrint: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur">
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Pending Orders</h2>
          <button onClick={onClose} className="text-muted hover:text-text text-xl">
            ×
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="text-center text-muted py-10 text-sm">
            No open orders.
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="card p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {o.type === "DINE_IN" && o.tableNumber
                      ? `Table ${o.tableNumber}`
                      : o.type}
                    {o.tableName ? ` · ${o.tableName}` : ""}
                  </div>
                  <div className="text-xs text-muted">
                    {o.itemCount} items · {formatPaisa(o.total, currency)}
                    {o.paid > 0 ? ` · paid ${formatPaisa(o.paid, currency)}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPrint(o.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-brand/50"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => onEdit(o.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-brand/50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onPay(o)}
                    className="text-xs px-3 py-1.5 rounded-lg btn-primary"
                  >
                    Pay
                  </button>
                  <button
                    onClick={() => onVoid(o.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line text-danger hover:border-danger/50"
                  >
                    Void
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
