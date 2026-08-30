"use client";

import { useState } from "react";
import { formatPaisa } from "@/lib/money";

export function Dashboard() {
  // In a real app, this data would come from API calls
  const [todaySales, setTodaySales] = useState(45250);
  const [todayOrders, setTodayOrders] = useState(124);
  const [averageTicket, setAverageTicket] = useState(365);
  const [paid, setPaid] = useState(42800);
  const [unheld, setUnheld] = useState(2450);
  const [refunds, setRefunds] = useState(1200);

  const [todaySalesChart, setTodaySalesChart] = useState([
    { date: "Aug 20", sales: 8500 },
    { date: "Aug 19", sales: 7200 },
    { date: "Aug 18", sales: 6800 },
    { date: "Aug 17", sales: 9100 },
    { date: "Aug 16", sales: 5500 },
  ]);

  const [orderTypeChart, setOrderTypeChart] = useState([
    { type: "DINE_IN", sales: 28500, count: 45 },
    { type: "TAKEAWAY", sales: 12300, count: 28 },
    { type: "DELIVERY", sales: 8900, count: 19 },
  ]);

  const [paymentMethodChart, setPaymentMethodChart] = useState([
    { method: "Cash", sales: 32500, count: 89 },
    { method: "Card", sales: 18900, count: 52 },
    { method: "Digital Wallet", sales: 8700, count: 24 },
  ]);

  const [topItems, setTopItems] = useState([
    { id: "1", name: "Classic Burger", sales: 12500 },
    { id: "2", name: "Coke", sales: 3200 },
    { id: "3", name: "Fries", sales: 2800 },
  ]);

  const [recentOrders, setRecentOrders] = useState([
    { id: "ORD-001", date: "Aug 20", total: 2850, payment: "Cash" },
    { id: "ORD-002", date: "Aug 19", total: 1850, payment: "Card" },
    { id: "ORD-003", date: "Aug 18", total: 3200, payment: "Cash" },
  ]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-between justify-between">
            <span className="text-xs uppercase tracking-widest text-muted">Today's Sales</span>
            <span className="text-2xl font-bold">{formatPaisa(todaySales)}</span>
          </div>
          <span className="text-sm text-muted">{todayOrders} Orders</span>
        </div>
        <div className="card p-4">
          <div className="flex items-between justify-between">
            <span className="text-xs uppercase tracking-widest text-muted">Average Ticket</span>
            <span className="text-2xl font-bold">{formatPaisa(averageTicket)}</span>
          </div>
          <span className="text-sm text-muted">per Order</span>
        </div>
        <div className="card p-4">
          <div className="flex items-between justify-between">
            <span className="text-xs uppercase tracking-widest text-muted">Paid</span>
            <span className="text-2xl font-bold">{formatPaisa(paid)}</span>
          </div>
          <span className="text-sm text-muted">Today</span>
        </div>
        <div className="card p-4">
          <div className="flex items-between justify-between">
            <span className="text-xs uppercase tracking-widest text-muted">Unheld</span>
            <span className="text-2xl font-bold">{formatPaisa(unheld)}</span>
          </div>
          <span className="text-sm text-muted">Pending</span>
        </div>
        <div className="card p-4">
          <div className="flex items-between justify-between">
            <span className="text-xs uppercase tracking-widest text-muted">Refunds</span>
            <span className="text-2xl font-bold">{formatPaisa(refunds)}</span>
          </div>
          <span className="text-sm text-muted">Today</span>
        </div>
      </div>

      {/* Today's Sales Chart */}
      <div className="card p-4">
        <h3 className="font-bold mb-3">Today's Sales Chart</h3>
        <div className="h-40 grid grid-cols-5">
          {todaySalesChart.map((day) => (
            <div
              key={day.date}
              className="h-8 rounded-border border border-brand/20 bg-brand/10"
              style={{ height: `${(day.sales / 12500) * 40}px` }}
            >
              <span className="text-xs text-primary capitalize capitalize">{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order Type Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {orderTypeChart.map((ot) => (
          <div key={ot.type} className="card p-2">
            <span className="font-bold text-sm">{ot.type}</span>
            <span className="text-primary">{formatPaisa(ot.sales)}</span>
            <span className="text-xs text-muted">{ot.count} Orders</span>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {paymentMethodChart.map((pm) => (
          <div key={pm.method} className="p-2 rounded-md border border-border">
            <span className="font-medium">{pm.method}</span>
            <span className="text-primary">{formatPaisa(pm.sales)}</span>
            <span className="text-xs text-muted">{pm.count} Transactions</span>
          </div>
        ))}
      </div>

      {/* Top Selling Products */}
      <div className="card p-4">
        <h3 className="font-bold mb-3">Top Selling Products</h3>
        <div className="grid grid-cols-2 gap-2">
          {topItems.map((item) => (
            <div key={item.id} className="p-2 rounded-md border border-border">
              <span className="font-medium">{item.name}</span>
              <span className="text-primary">{formatPaisa(item.sales)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card p-4">
        <h3 className="font-bold mb-3">Recent Orders</h3>
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center gap-2 py-1 border-b">
              <span className="font-medium">{order.id}</span>
              <span className="text-xs text-muted">{order.date}</span>
              <span className="text-primary">{formatPaisa(order.total)}</span>
              <span className="text-xs text-muted">{order.payment}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}