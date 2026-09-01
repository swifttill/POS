export const PERMISSIONS = [
  // POS / orders
  "pos.access", "orders.view", "orders.create", "orders.edit_open", "orders.transfer", "orders.combine", "orders.split_bill", "orders.change_type", "orders.change_table", "orders.change_waiter", "orders.reprint",
  // Payments / financial actions
  "payments.view", "payments.create", "payments.correct", "payments.split_tender",
  "discounts.view", "discounts.apply_preset", "discounts.apply_custom", "discounts.remove", "discounts.approve",
  "voids.view", "voids.item", "voids.order", "refunds.view", "refunds.create", "refunds.approve",
  // Shifts / cash drawer
  "shifts.view", "shifts.open", "shifts.close_own", "shifts.close_any", "shifts.cash_movement", "shifts.x_report", "shifts.z_report",
  // Reports
  "reports.access", "reports.sales", "reports.financial", "reports.item", "reports.custom", "reports.audit", "reports.export", "reports.saved_manage",
  // Catalogue
  "menu.view", "menu.edit", "categories.manage", "modifiers.manage", "deals.manage",
  // Access administration
  "users.view", "users.manage", "users.activate", "users.reset_pin", "users.assign_roles", "users.override_permissions", "users.sessions_revoke",
  "roles.view", "roles.manage", "roles.create", "roles.clone", "roles.delete", "roles.assign_permissions",
  "access.audit",
  // System administration
  "settings.view", "settings.manage", "security.view", "security.manage", "devices.view", "devices.manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type SystemRole = "ADMIN" | "MANAGER" | "CASHIER" | "WAITER";

const ALL = [...PERMISSIONS] as Permission[];
export const ROLE_PRESETS: Record<SystemRole, readonly Permission[]> = Object.freeze({
  ADMIN: ALL,
  MANAGER: ALL.filter((p) => ![
    "roles.delete", "security.manage"
  ].includes(p)),
  CASHIER: [
    "pos.access","orders.view","orders.create","orders.edit_open","orders.split_bill","orders.reprint",
    "payments.view","payments.create","payments.split_tender","discounts.view","discounts.apply_preset",
    "shifts.view","shifts.open","shifts.close_own","shifts.x_report","reports.access","reports.sales","reports.item","menu.view"
  ],
  WAITER: ["pos.access","orders.view","orders.create","orders.edit_open","orders.transfer","orders.change_table","orders.change_waiter","menu.view"]
});

export function hasPermission(granted: readonly string[], required: Permission): boolean {
  return granted.includes(required);
}

export function assertPermission(granted: readonly string[], required: Permission): void {
  if (!hasPermission(granted, required)) throw new Error(`PERMISSION_DENIED:${required}`);
}
