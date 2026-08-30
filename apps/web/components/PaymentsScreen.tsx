"use client";

import { useState } from "react";
import { formatPaisa } from "@/lib/money";

export function PaymentsScreen() {
  const [totalDue, setTotalDue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountReceived, setAmountReceived] = useState(0);
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);

  const methods = ["Cash", "Card", "Bank", "Digital Wallet"];

  const calculateChange = () => {
    return Math.max(0, amountDue - amountReceived);
  };

  const amountDue = totalDue; // In a real app, this would come from the order state

  return (
    <div className="p-6">
      <h2 className="font-bold mb-4">Payment</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-muted mb-1">Total Due</label>
          <span className="font-bold text-2xl">{formatPaisa(totalDue)}</span>
        </div>
        <div>
          <label className="text-sm text-muted mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank">Bank</option>
            <option value="Digital Wallet">Digital Wallet</option>
          </select>
        </div>
      </div>

      {splitPayment ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm text-muted mb-1">Cash</label>
            <input
              type="number"
              value={splitCash || 0}
              onChange={(e) => setSplitCash(Number(e.target.value))}
              inputMode="decimal"
              className="input w-full px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted mb-1">Card</label>
            <input
              type="number"
              value={splitCard || 0}
              onChange={(e) => setSplitCard(Number(e.target.value))}
              inputMode="decimal"
              className="input w-full sm:w-44 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-sm text-muted mb-1">Amount Received</label>
        <input
          type="number"
          value={amountReceived}
          onChange={(e) => setAmountReceived(Number(e.target.value))}
          inputMode="decimal"
          className="input w-full sm:w-44 px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="text-sm text-muted mb-1">Change</label>
        <span className="font-bold text-xl">{formatPaisa(calculateChange())}</span>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setSplitPayment(false)}
          className="btn-secondary px-4 py-2"
        >
          Cancel
        </button>
        <button
          onClick={() => alert("Payment completed!")}
          className="btn-primary px-4 py-2"
        >
          Complete Payment
        </button>
      </div>
    </div>
  );
}