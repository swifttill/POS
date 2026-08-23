import type { MenuResponse } from "@/lib/types";

export async function fetchMenu(): Promise<MenuResponse> {
  const res = await fetch("/api/menu", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export interface CreateOrderItemInput {
  menuItemId?: string;
  name?: string;
  unitPrice?: number;
  station?: "BAR" | "GRILL" | "FRY" | "MAIN" | "DESSERT" | "EXPO";
  quantity: number;
  notes?: string | null;
  seat?: number | null;
  modifiers?: { name: string; priceDelta: number }[];
}

export interface CreateOrderPayment {
  tender: "CASH" | "CARD" | "ONLINE";
  amount: number;
}

export interface CreateOrderInput {
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  pax?: number | null;
  waiterName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  shiftId?: string | null;
  items: CreateOrderItemInput[];
  payments: CreateOrderPayment[];
  discountPaisa?: number;
  discountReason?: string | null;
}

export async function createOrder(input: CreateOrderInput) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create order");
  return data.order as { id: string };
}
