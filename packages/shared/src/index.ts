export const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const TENDERS = ["CASH", "CARD", "ONLINE"] as const;
export type Tender = (typeof TENDERS)[number];

export const OPERATIONAL_STATUSES = ["OPEN", "CLOSED", "VOIDED"] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const FINANCIAL_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "PARTIALLY_REFUNDED",
  "FULLY_REFUNDED",
] as const;
export type FinancialStatus = (typeof FINANCIAL_STATUSES)[number];
