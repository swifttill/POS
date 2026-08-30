"use client";

import { useState } from "react";
import { formatPaisa } from "@/lib/money";

export function ReportsScreen() {
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "this-week" | "this-month" | "custom">("today");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const applyFilters = () => {
    // In a real app, this would re-fetch the API with filter params
    console.log("Filters applied:", { dateRange, selectedCashier, selectedStatus, selectedPayment, selectedCategory });
  };

  // Static/sample data for reports
  const salesReport = {
    totalSales: 45250,
    totalOrders: 124,
  };

  const dailySales = [
    { date: "Aug 20", sales: 8500 },
    { date: "Aug 19", sales: 7200 },
    { date: "Aug 18", sales: 6800 },
    { date: "Aug 17", sales: 9100 },
    { date: "Aug 16", sales: 5500 },
  ];

  const productSales = [
    { id: "1", name: "Classic Burger", sales: 12500 },
    { id: "2", name: "Coke", sales: 3200 },
    { id: "3", name: "Fries", sales: 2800 },
  ];

  const categorySales = [
    { category: "Food", sales: 32000 },
    { category: "Drinks", sales: 8500 },
  ];

  const orderTypeReport = [
    { type: "DINE_IN", sales: 28500, count: 45 },
    { type: "TAKEAWAY", sales: 12300, count: 28 },
    { type: "DELIVERY", sales: 8900, count: 19 },
  ];

  const paymentReport = [
    { method: "Cash", sales: 32500, count: 89 },
    { method: "Card", sales: 18900, count: 52 },
  ];

  const discountReport = [
    { discount: "10% off", savings: 1500 },
    { discount: "Free delivery", savings: 800 },
  ];

  const taxReport = [
    { taxType: "GST", amount: 7200 },
    { taxType: "Service tax", amount: 1200 },
  ];

  const cashierReport = [
    { cashier: "Ahmed", sales: 28500, orders: 42 },
    { cashier: "Maria", sales: 18900, orders: 31 },
  ];

  const shiftReport = [
    { shift: "Morning", sales: 25000, orders: 35 },
    { shift: "Evening", sales: 20250, orders: 28 },
  ];

  const refundReport = [
    { id: "R-001", date: "Aug 19", amount: 350, reason: "Item defective" },
    { id: "R-002", date: "Aug 18", amount: 200, reason: "Customer changed mind" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-xl">Reports</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Cashier</label>
          <select
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="">All Cashiers</option>
            <option value="Ahmed">Ahmed</option>
            <option value="Maria">Maria</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Payment Method</label>
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-full sm:w-44 px-3 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            <option value="Food">Food</option>
            <option value="Drinks">Drinks</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sales Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Sales Report</h4>
          <div>
            <span>Total Sales:</span> <span>{formatPaisa(salesReport.totalSales)}</span>
            <span>Total Orders:</span> <span>{salesReport.totalOrders}</span>
          </div>
        </div>

        {/* Daily Sales */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Daily Sales</h4>
          <div className="h-40">
            {dailySales.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted">No data</div>
            ) : (
              <div>
                {dailySales.map((d) => (
                  <div key={d.date} className="h-8 bg-border border border-border/20 mb-1">
                    <span className="text-xs text-muted">{d.date}</span>
                    <span className="text-primary">{formatPaisa(d.sales)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Sales */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Product Sales</h4>
          <div className="h-40">
            {productSales.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted">No data</div>
            ) : (
              <div>
                {productSales.map((p) => (
                  <div key={p.id} className="h-8 border border-border mb-1">
                    <span className="font-medium text-primary">{p.name}</span>
                    <span className="text-xs text-muted">{formatPaisa(p.sales)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Type Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Order Type Report</h4>
          <div className="h-40">
            {orderTypeReport.map((ot) => (
              <div key={ot.type} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{ot.type}</span>
                <span className="text-xs text-muted">{formatPaisa(ot.sales)}</span>
                <span className="text-xs text-muted">{ot.count} Orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Payment Report</h4>
          <div className="h-40">
            {paymentReport.map((pm) => (
              <div key={pm.method} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{pm.method}</span>
                <span className="text-xs text-muted">{formatPaisa(pm.sales)}</span>
                <span className="text-xs text-muted">{pm.count} Transactions</span>
              </div>
            ))}
          </div>
        </div>

        {/* Discount Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Discount Report</h4>
          <div className="h-40">
            {discountReport.map((d) => (
              <div key={d.discount} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{d.discount}</span>
                <span className="text-xs text-muted">{formatPaisa(d.savings)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Tax Report</h4>
          <div className="h-40">
            {taxReport.map((t) => (
              <div key={t.taxType} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{t.taxType}</span>
                <span className="text-xs text-muted">{formatPaisa(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashier Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Cashier Report</h4>
          <div className="h-40">
            {cashierReport.map((c) => (
              <div key={c.cashier} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{c.cashier}</span>
                <span className="text-xs text-muted">{formatPaisa(c.sales)}</span>
                <span className="text-xs text-muted">{c.orders} Orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shift Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Shift Report</h4>
          <div className="h-40">
            {shiftReport.map((s) => (
              <div key={s.shift} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{s.shift}</span>
                <span className="text-xs text-muted">{formatPaisa(s.sales)}</span>
                <span className="text-xs text-muted">{s.orders} Orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refund Report */}
        <div className="card p-4">
          <h4 className="font-bold mb-3">Refund Report</h4>
          <div className="h-40">
            {refundReport.map((r) => (
              <div key={r.id} className="h-8 border border-border mb-1">
                <span className="font-medium text-primary">{r.id}</span>
                <span className="text-xs text-muted">{r.date}</span>
                <span className="text-primary">{formatPaisa(r.amount)}</span>
                <span className="text-xs text-muted">{r.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}