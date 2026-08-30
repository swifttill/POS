"use client";

import { useState } from "react";
import { formatPaisa } from "@/lib/money";

interface OrderStatus {
  id: string;
  date: string;
  customerName: string | null;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "PICKUP";
  tableNumber: number | null;
  cashier: string;
  amount: number;
  paymentMethod: string;
  status: "OPEN" | "PAID" | "REFUNDED" | "VOIDED";
}

interface OrdersTableProps {
  onView: (order: OrderStatus) => void;
  onPrint: (order: OrderStatus) => void;
  onRefund: (order: OrderStatus) => void;
  onCancel: (order: OrderStatus) => void;
}

export function OrdersTable({ onView, onPrint, onRefund, onCancel }: OrdersTableProps) {
  // Static orders data - in real app, this would come from API
  const orders: OrderStatus[] = [
    {
      id: "ORD-001",
      date: "Aug 20, 2024",
      customerName: "Ahmed R.",
      orderType: "DINE_IN",
      tableNumber: 5,
      cashier: "Maria",
      amount: 2850,
      paymentMethod: "Cash",
      status: "OPEN",
    },
    {
      id: "ORD-002",
      date: "Aug 19, 2024",
      customerName: "Maria L.",
      orderType: "TAKEAWAY",
      tableNumber: null,
      cashier: "Ahmed",
      amount: 1850,
      paymentMethod: "Card",
      status: "PAID",
    },
    {
      id: "ORD-003",
      date: "Aug 18, 2024",
      customerName: "Walk-in",
      orderType: "DELIVERY",
      tableNumber: null,
      cashier: "Maria",
      amount: 3200,
      paymentMethod: "Digital Wallet",
      status: "OPEN",
    },
  ];

  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredOrders = orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    { header: "Order #", accessor: "id", align: "center" },
    { header: "Date/Time", accessor: "date", align: "center" },
    { header: "Customer", accessor: "customerName", align: "center" },
    { header: "Type", accessor: "orderType", align: "center" },
    { header: "Table", accessor: "tableNumber", align: "center" },
    { header: "Cashier", accessor: "cashier", align: "center" },
    { header: "Amount", accessor: "amount", align: "center" },
    { header: "Payment", accessor: "paymentMethod", align: "center" },
    { header: "Status", accessor: "status", align: "center" },
    { header: "Actions", accessor: "actions", align: "center" },
  ];

  if (filteredOrders.length === 0 && statusFilter) {
    return (
      <div className="p-8 text-center">
        <div>No orders found matching filter: {statusFilter}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full sm:w-44 px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Order Type</label>
            <select
              onChange={(e) => {}}
              className="input w-full sm:w-44 px-3 py-1.5 text-sm disabled:text-muted/50"
            >
              <option value="">All</option>
              <option value="DINE_IN">Dine-in</option>
              <option value="TAKEAWAY">Takeaway</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Cashier</label>
            <select
              onChange={(e) => {}}
              className="input w-full sm:w-44 px-3 py-1.5 text-sm disabled:text-muted/50"
            >
              <option value="">All</option>
              <option value="Ahmed">Ahmed</option>
              <option value="Maria">Maria</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-line collapsed">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.header} className="text-xs font-semibold text-muted py-2 border-b border-line">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const statusClass =
                order.status === "OPEN"
                  ? "text-brand"
                  : order.status === "PAID"
                  ? "text-success"
                  : order.status === "REFUNDED"
                  ? "text-muted"
                  : "text-danger";

              return (
                <tr key={order.id} className="border-b border-line">
                  <td className="font-medium">{order.id}</td>
                  <td className="text-xs text-muted">{order.date}</td>
                  <td className="text-xs text-muted">{order.customerName || "Walk-in"}</td>
                  <td className="text-xs">{order.orderType}</td>
                  <td className="text-xs">{order.tableNumber || "—"}</td>
                  <td className="text-xs text-muted">{order.cashier}</td>
                  <td className="font-medium">{formatPaisa(order.amount)}</td>
                  <td className="text-xs text-muted">{order.paymentMethod}</td>
                  <td className={`${statusClass} text-xs font-medium`}>{order.status}</td>
                  <td className="text-xs">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onView(order)}
                        title="View"
                        className="text-[10px] underline text-brand hover:text-brand/80"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onPrint(order)}
                        title="Print"
                        className="text-[10px] underline text-brand hover:text-brand/80"
                      >
                        Print
                      </button>
                      {order.status === "OPEN" && (
                        <>
                          <button
                            onClick={() => onRefund(order)}
                            title="Refund"
                            className="text-[10px] underline text-danger hover:text-danger/80"
                          >
                            Refund
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onCancel(order)}
                        title="Cancel"
                        className="text-[10px] underline text-muted hover:text-muted/80"
                      >
                        Cancel
                      </button>
                    </div>
              </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}