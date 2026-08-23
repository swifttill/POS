"use client";

import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { OrderTypeTabs } from "@/components/OrderTypeTabs";
import { TableMap, type TableDTO } from "@/components/TableMap";
import { CategoryRail } from "@/components/CategoryRail";
import { MenuItemCard } from "@/components/MenuItemCard";
import { DealCard } from "@/components/DealCard";
import { ModifierModal } from "@/components/ModifierModal";
import { Cart } from "@/components/Cart";
import {
  CheckoutModal,
  type CheckoutContext,
} from "@/components/CheckoutModal";
import OrdersModal from "@/components/OrdersModal";
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
  CategoryDTO,
  CompanyDTO,
  DealDTO,
  MenuItemDTO,
  MenuResponse,
  OrderType,
} from "@/lib/types";

export default function FOHPage() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderQueued, setLastOrderQueued] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu()
      .then((m) => {
        setMenu(m);
        setActiveCat(m.categories[0]?.id ?? null);
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));

    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables ?? []))
      .catch(() => {});

    fetch("/api/shifts")
      .then((r) => r.json())
      .then((d) => setCurrentShiftId(d.shift?.id ?? null))
      .catch(() => {});

    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const company = menu?.company;
  const currency = company?.currency ?? "PKR";

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
    if (item.modifierGroups.length > 0) {
      setModifierItem(item);
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        lineId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity: 1,
        notes: "",
        seat: null,
        station: item.printerStation,
        modifiers: [],
      },
    ]);
  }

  function onQty(lineId: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }
  function onRemove(lineId: string) {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  async function sendBillToPrinter(id: string) {
    try {
      await fetch(`/api/orders/${id}/bill`, { method: "POST" });
    } catch {
      /* agent will retry while order stays queued */
    }
  }

  const [showOrders, setShowOrders] = useState(false);
  const [pendingVoidId, setPendingVoidId] = useState<string | null>(null);
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
  const [orders, setOrders] = useState<
    {
      id: string;
      type: string;
      status: string;
      total: number;
      createdAt: string;
      tableNumber: number | null;
      itemCount: number;
    }[]
  >([]);

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.items ?? data.orders ?? []);
    } catch {
      /* ignore */
    }
  }

  async function voidOrder(id: string) {
    try {
      await fetch(`/api/orders/${id}/void`, { method: "POST" });
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  async function reprintKot(id: string) {
    try {
      await fetch(`/api/orders/${id}/kot`, { method: "POST" });
    } catch {
      /* agent will reprint */
    }
  }

  async function refundOrder(id: string) {
    try {
      await fetch(`/api/orders/${id}/refund`, { method: "POST" });
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  // Add a deal as a single cart line (its components become kitchen-only
  // modifiers, so the customer bill shows only the deal name).
  function addDeal(deal: DealDTO) {
    setLines((prev) => [
      ...prev,
      {
        lineId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
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

  async function submitOrder(payload: import("@/lib/api").CreateOrderInput) {
    try {
      const order = await createOrder({ ...payload, shiftId: currentShiftId });
      setLastOrderQueued(false);
      return { id: order.id };
    } catch (e) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const id = await enqueue(payload);
        setLastOrderQueued(true);
        setPendingSync(await queueCount().catch(() => 0));
        return { id, queued: true };
      }
      throw e;
    }
  }

  async function flushQueue() {
    try {
      const q = await getQueue();
      for (const item of q) {
        try {
          await createOrder(item.payload);
          await removeFromQueue(item.id);
        } catch {
          // still offline / failed — keep for next attempt
        }
      }
    } catch {
      /* IndexedDB unavailable */
    } finally {
      setPendingSync(await queueCount().catch(() => 0));
    }
  }

  useEffect(() => {
    flushQueue();
    const onUp = () => {
      setOffline(false);
      flushQueue();
    };
    const onDown = () => setOffline(true);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    const iv = setInterval(flushQueue, 15000);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkoutContext: CheckoutContext = {
    type: orderType,
    tableId: orderType === "DINE_IN" ? tableId : null,
    pax: orderType === "DINE_IN" ? pax : null,
    waiterName: waiter || null,
    customerName: orderType === "DELIVERY" ? customerName || null : null,
    customerPhone: orderType === "DELIVERY" ? customerPhone || null : null,
    customerAddress: orderType === "DELIVERY" ? customerAddress || null : null,
  };

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading SwiftTill…</div>
      </main>
    );
  }

  const activeItems =
    menu?.categories.find((c) => c.id === activeCat)?.items ?? [];

  return (
    <div className="h-screen flex flex-col">
      {offline ? (
        <div className="bg-amber-500/20 text-amber-200 text-xs text-center py-1">
          Offline — orders will queue locally and sync when connection returns.
        </div>
      ) : null}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {pendingSync > 0 ? (
              <span
                className="text-xs px-2 py-1.5 rounded-lg border border-amber-500/40 text-amber-300"
                title="Orders waiting to sync"
              >
                ⟳ {pendingSync} pending sync
              </span>
            ) : null}
            <input
              value={waiter}
              disabled={lockWaiter}
              onChange={(e) => setWaiter(e.target.value)}
              placeholder="Waiter name / PIN"
              className="bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-sm w-44 outline-none focus:border-electric disabled:opacity-50"
            />
            <button
              onClick={() => setLockWaiter((v) => !v)}
              className={`text-xs px-2 py-1.5 rounded-lg border border-line ${
                lockWaiter ? "text-cyan" : "text-muted"
              }`}
              title="Lock waiter"
            >
              {lockWaiter ? "🔒" : "🔓"}
            </button>
            <button
              onClick={() => {
                setShowOrders(true);
                loadOrders();
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-line hover:border-electric/50"
            >
              Orders
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3">
        {/* Left: order context */}
        <section className="col-span-12 lg:col-span-3 card p-3 overflow-y-auto">
          <OrderTypeTabs value={orderType} onChange={setOrderType} />

          {orderType === "DINE_IN" ? (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-widest text-muted mb-2">
                Tables
              </div>
              <TableMap
                tables={tables}
                selectedId={tableId}
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
                  className="mt-1 w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric"
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
                  className="mt-1 w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric"
                />
              </label>
            </div>
          ) : null}

          {orderType === "TAKEAWAY" ? (
            <div className="mt-3 text-sm text-muted">
              Quick counter sale — send straight to checkout.
            </div>
          ) : null}
        </section>

        {/* Center: menu */}
        <section className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
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
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    currency={currency}
                    onAdd={addDeal}
                  />
                ))
              : activeItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} onClick={addItem} />
                ))}
          </div>
        </section>

        {/* Right: cart */}
        <aside className="col-span-12 lg:col-span-3 card p-3 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto -mr-2 pr-2">
            <Cart
              lines={lines}
              currency={currency}
              onQty={onQty}
              onRemove={onRemove}
            />
          </div>
          <div className="border-t border-line pt-3 mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPaisa(subtotal, currency)}</span>
            </div>
            {company?.gstEnabled ? (
              <div className="flex justify-between text-muted">
                <span>GST {company.gstRate}%</span>
                <span>{formatPaisa(tax, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="glow-text">{formatPaisa(total, currency)}</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={lines.length === 0}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-40"
            >
              Checkout
            </button>
          </div>
        </aside>
      </main>

      {modifierItem ? (
        <ModifierModal
          item={modifierItem}
          defaultSeat={null}
          onConfirm={(line) => {
            setLines((prev) => [...prev, line]);
            setModifierItem(null);
          }}
          onCancel={() => setModifierItem(null)}
        />
      ) : null}

      {checkoutOpen ? (
        <CheckoutModal
          currency={currency}
          subtotal={subtotal}
          tax={tax}
          total={total}
          gstEnabled={!!company?.gstEnabled}
          gstRate={company?.gstRate ?? 0}
          lines={lines}
          context={checkoutContext}
          onClose={() => setCheckoutOpen(false)}
          onSubmit={submitOrder}
          onSuccess={(id) => {
            setCheckoutOpen(false);
            setLines([]);
            setLastOrderId(id);
          }}
        />
      ) : null}

      {lastOrderId ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] card glow-border px-5 py-3 flex items-center gap-4">
          <span className="text-sm">
            Order <b className="glow-text">{lastOrderId.slice(0, 8)}</b>{" "}
            {lastOrderQueued ? "queued offline — will sync." : "sent."}
          </span>
          {!lastOrderQueued ? (
            <>
              <a
                href={`/orders/${lastOrderId}/print`}
                target="_blank"
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Print Bill
              </a>
              <button
                onClick={() => sendBillToPrinter(lastOrderId!)}
                className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-electric/50"
                title="Send to billing printer via agent"
              >
                🖨 Send to Printer
              </button>
            </>
          ) : null}
          <button
            onClick={() => {
              setLastOrderId(null);
              setLastOrderQueued(false);
            }}
            className="text-muted hover:text-text"
          >
            ×
          </button>
        </div>
      ) : null}

      {showOrders ? (
        <OrdersModal
          orders={orders}
          onClose={() => setShowOrders(false)}
          onVoid={(id) => setPendingVoidId(id)}
          onRefund={(id) => setPendingRefundId(id)}
          onReprintBill={sendBillToPrinter}
          onReprintKot={reprintKot}
        />
      ) : null}

      {pendingVoidId ? (
        <ManagerPinModal
          title="Void order"
          confirmLabel="Void"
          onSuccess={() => {
            voidOrder(pendingVoidId);
            setPendingVoidId(null);
          }}
          onClose={() => setPendingVoidId(null)}
        />
      ) : null}

      {pendingRefundId ? (
        <ManagerPinModal
          title="Refund order"
          confirmLabel="Refund"
          onSuccess={() => {
            refundOrder(pendingRefundId);
            setPendingRefundId(null);
          }}
          onClose={() => setPendingRefundId(null)}
        />
      ) : null}
    </div>
  );
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
        className="mt-1 w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric"
      />
    </label>
  );
}
