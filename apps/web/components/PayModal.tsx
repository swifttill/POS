"use client";

import { useMemo, useState } from "react";
import { formatPaisa, paisaFromRupees, gstAmount } from "@/lib/money";

type Tender = "CASH" | "CARD" | "ONLINE";

export interface PayResult {
  payments: { tender: Tender; amount: number }[];
  discountPaisa: number;
  discountReason: string | null;
}

export function PayModal({
  currency,
  subtotal,
  tax,
  total,
  gstEnabled,
  gstRate,
  existingPaid = 0,
  title = "Payment",
  onClose,
  onSubmit,
}: {
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  gstEnabled: boolean;
  gstRate: number;
  existingPaid?: number;
  title?: string;
  onClose: () => void;
  onSubmit: (result: PayResult) => Promise<void>;
}) {
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [online, setOnline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const discountedTotal =
    discountApproved && discountPaisa > 0
      ? discountedSubtotal + discountedTax
      : total;

  const balance = Math.max(0, discountedTotal - existingPaid);
  const tendered = useMemo(
    () =>
      paisaFromRupees(Number(cash) || 0) +
      paisaFromRupees(Number(card) || 0) +
      paisaFromRupees(Number(online) || 0),
    [cash, card, online]
  );
  const remaining = balance - tendered;

  function fillCash() {
    setCash((balance / 100).toFixed(2));
  }

  async function submit() {
    setError(null);
    if (remaining > 0) {
      setError(
        `Tendered does not cover the balance (${formatPaisa(remaining, currency)} remaining).`
      );
      return;
    }
    const cashPaisa = paisaFromRupees(Number(cash) || 0);
    const cardPaisa = paisaFromRupees(Number(card) || 0);
    const onlinePaisa = paisaFromRupees(Number(online) || 0);

    // Non-cash tenders apply the exact amount tendered; cash covers the
    // remainder, and any cash overpayment is returned as change (not applied).
    let cardApplied = Math.min(cardPaisa, Math.max(0, balance));
    const cardRoom = balance - cardApplied;
    const onlineApplied = Math.min(onlinePaisa, Math.max(0, cardRoom));
    const appliedNonCash = cardApplied + onlineApplied;
    const cashApplied = Math.max(0, Math.min(cashPaisa, balance - appliedNonCash));

    const payments = (
      [
        { tender: "CASH" as Tender, amount: cashApplied },
        { tender: "CARD" as Tender, amount: cardApplied },
        { tender: "ONLINE" as Tender, amount: onlineApplied },
      ]
    ).filter((p) => p.amount > 0);

    setSubmitting(true);
    try {
      await onSubmit({
        payments,
        discountPaisa: discountApproved ? discountPaisa : 0,
        discountReason: discountApproved ? discountReason || null : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur">
      <div className="card w-full max-w-md rounded-b-none sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
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
          {existingPaid > 0 ? (
            <Row
              label="Already paid"
              value={`- ${formatPaisa(existingPaid, currency)}`}
            />
          ) : null}
          <div className="border-t border-line my-2" />
          <Row label="Total" value={formatPaisa(total, currency)} bold />
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
            </>
          ) : null}
        </div>

        <div className="rounded-xl border border-line bg-background p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Discount</span>
            {discountApproved && discountPaisa > 0 ? (
              <span className="text-xs text-success">
                Approved · {formatPaisa(discountPaisa, currency)} off
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowManager(true)}
                className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-brand/50"
              >
                Add Discount (Manager)
              </button>
            )}
          </div>
          {!discountApproved ? (
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                value={discountRs}
                onChange={(e) => setDiscountRs(e.target.value)}
                placeholder="Amount (Rs)"
                className="input flex-1 px-3 py-2 text-sm"
              />
              <input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason"
                className="input flex-1 px-3 py-2 text-sm"
              />
            </div>
          ) : (
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
          )}
        </div>

        <div className="space-y-2 mb-4">
          <TenderInput label="Cash" value={cash} onChange={setCash} />
          <TenderInput label="Card" value={card} onChange={setCard} />
          <TenderInput label="Online / Transfer" value={online} onChange={setOnline} />
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-muted">Balance due</span>
          <span
            className={`font-bold ${
              remaining === 0 ? "text-success" : "glow-text"
            }`}
          >
            {formatPaisa(Math.max(0, remaining), currency)}
          </span>
        </div>
        <button
          onClick={fillCash}
          className="card w-full py-2 text-xs text-muted hover:text-text mb-4"
        >
          Cover balance with Cash
        </button>

        {error ? (
          <div className="text-xs text-danger mb-3">{error}</div>
        ) : null}

        <button
          onClick={submit}
          disabled={submitting || remaining > 0}
          className="btn-primary w-full py-3 disabled:opacity-40"
        >
          {submitting ? "Processing…" : "Record Payment"}
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
