"use client";

import { useMemo, useState } from "react";
import type { CartLine } from "@/lib/types";
import { formatPaisa, paisaFromRupees, gstAmount } from "@/lib/money";
import type { CreateOrderInput } from "@/lib/api";
import ManagerPinModal from "@/components/ManagerPinModal";

type Tender = "CASH" | "CARD" | "ONLINE";

export interface CheckoutContext {
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  pax?: number | null;
  waiterName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
}

export function CheckoutModal({
  currency,
  subtotal,
  tax,
  total,
  gstEnabled,
  gstRate,
  lines,
  context,
  onClose,
  onSubmit,
  onSuccess,
}: {
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  gstEnabled: boolean;
  gstRate: number;
  lines: CartLine[];
  context: CheckoutContext;
  onClose: () => void;
  onSubmit: (payload: CreateOrderInput) => Promise<{ id: string }>;
  onSuccess: (orderId: string) => void;
}) {
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [online, setOnline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manager-approved discount.
  const [discountRs, setDiscountRs] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [discountApproved, setDiscountApproved] = useState(false);
  const [showManager, setShowManager] = useState(false);

  const discountPaisa = useMemo(
    () => Math.max(0, Math.floor(paisaFromRupees(Number(discountRs) || 0))),
    [discountRs]
  );
  const discountedSubtotal = Math.max(0, subtotal - discountPaisa);
  const discountedTax = gstEnabled ? gstAmount(discountedSubtotal, gstRate) : 0;
  const discountedTotal = discountApproved && discountPaisa > 0
    ? discountedSubtotal + discountedTax
    : total;

  const tendered = useMemo(
    () => paisaFromRupees(Number(cash) || 0) + paisaFromRupees(Number(card) || 0) + paisaFromRupees(Number(online) || 0),
    [cash, card, online]
  );
  const remaining = discountedTotal - tendered;

  function fillCash() {
    setCash((discountedTotal / 100).toFixed(2));
  }

  async function submit() {
    setError(null);
    if (remaining !== 0) {
      setError(`Tendered does not match total (${formatPaisa(remaining, currency)} remaining).`);
      return;
    }
    setSubmitting(true);
    try {
      const payments = [
        { tender: "CASH" as Tender, amount: paisaFromRupees(Number(cash) || 0) },
        { tender: "CARD" as Tender, amount: paisaFromRupees(Number(card) || 0) },
        { tender: "ONLINE" as Tender, amount: paisaFromRupees(Number(online) || 0) },
      ].filter((p) => p.amount > 0);

      const payload: CreateOrderInput = {
        type: context.type,
        tableId: context.tableId ?? null,
        pax: context.pax ?? null,
        waiterName: context.waiterName ?? null,
        customerName: context.customerName ?? null,
        customerPhone: context.customerPhone ?? null,
        customerAddress: context.customerAddress ?? null,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          notes: l.notes || null,
          seat: l.seat ?? null,
          modifiers: l.modifiers.map((m) => ({
            name: m.name,
            priceDelta: m.priceDelta,
          })),
        })),
        payments,
        discountPaisa: discountApproved ? discountPaisa : 0,
        discountReason: discountApproved ? discountReason || null : null,
      };

      const order = await onSubmit(payload);
      onSuccess(order.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur">
      <div className="card w-full max-w-md rounded-b-none sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-muted hover:text-text text-xl">
            ×
          </button>
        </div>

        <div className="space-y-1 text-sm mb-4">
          <Row label="Subtotal" value={formatPaisa(subtotal, currency)} />
          {gstEnabled ? (
            <Row
              label={`Tax (GST ${gstRate}%)`}
              value={formatPaisa(tax, currency)}
            />
          ) : null}
          <div className="border-t border-line my-2" />
          <Row
            label="Total"
            value={formatPaisa(total, currency)}
            bold
          />
        </div>

        <div className="rounded-xl border border-line bg-background p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Discount</span>
            {discountApproved && discountPaisa > 0 ? (
              <span className="text-xs text-emerald-400">
                Approved · {formatPaisa(discountPaisa, currency)} off
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowManager(true)}
                className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-electric/50"
              >
                Add Discount (Manager)
              </button>
            )}
          </div>
          {discountApproved && discountPaisa > 0 ? (
            <>
              <Row
                label="Discount"
                value={`- ${formatPaisa(discountPaisa, currency)}`}
              />
              <Row
                label="Discounted Total"
                value={formatPaisa(discountedTotal, currency)}
                bold
              />
              <button
                type="button"
                onClick={() => {
                  setDiscountApproved(false);
                  setDiscountRs("");
                  setDiscountReason("");
                }}
                className="mt-2 text-xs text-muted hover:text-text"
              >
                Remove discount
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                value={discountRs}
                onChange={(e) => setDiscountRs(e.target.value)}
                placeholder="Amount (Rs)"
                className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm"
              />
              <input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason"
                className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm"
              />
            </div>
          )}
        </div>

        {showManager ? (
          <ManagerPinModal
            title="Approve discount"
            confirmLabel="Approve"
            onSuccess={() => {
              if (discountPaisa <= 0) {
                setError("Enter a discount amount first.");
                setShowManager(false);
                return;
              }
              setDiscountApproved(true);
              setShowManager(false);
            }}
            onClose={() => setShowManager(false)}
          />
        ) : null}

        <div className="space-y-2 mb-4">
          <TenderInput label="Cash" value={cash} onChange={setCash} />
          <TenderInput label="Card" value={card} onChange={setCard} />
          <TenderInput label="Online / Transfer" value={online} onChange={setOnline} />
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-muted">Remaining</span>
          <span
            className={`font-bold ${
              remaining === 0 ? "text-emerald-400" : "glow-text"
            }`}
          >
            {formatPaisa(remaining, currency)}
          </span>
        </div>
        <button
          onClick={fillCash}
          className="card w-full py-2 text-xs text-muted hover:text-text mb-4"
        >
          Cover remaining with Cash
        </button>

        {error ? (
          <div className="text-xs text-pink-400 mb-3">{error}</div>
        ) : null}

        <button
          onClick={submit}
          disabled={submitting || remaining !== 0}
          className="btn-primary w-full py-3 disabled:opacity-40"
        >
          {submitting ? "Processing…" : "Charge & Send to Kitchen"}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold" : "text-muted"}>{label}</span>
      <span className={bold ? "font-bold glow-text text-base" : ""}>{value}</span>
    </div>
  );
}

function TenderInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 card px-3 py-2">
      <span className="w-32 text-sm text-muted">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="flex-1 bg-transparent outline-none text-right font-semibold"
      />
    </label>
  );
}
