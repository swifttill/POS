export type Role = "ADMIN" | "MANAGER" | "WAITER";

export type Permission =
  | "manageMenu"
  | "manageDeals"
  | "manageTables"
  | "manageCompany"
  | "manageUsers"
  | "viewReports"
  | "closeShift"
  | "discount"
  | "void"
  | "refund"
  | "voidRequiresPin"
  | "refundRequiresPin"
  | "resetOwnPin";

export type Permissions = Record<Permission, boolean>;

export const PERMISSION_LABELS: Record<Permission, string> = {
  manageMenu: "Manage menu",
  manageDeals: "Manage deals",
  manageTables: "Manage floor & tables",
  manageCompany: "Manage company settings",
  manageUsers: "Manage users & permissions",
  viewReports: "View reports",
  closeShift: "Open / close shifts",
  discount: "Apply discounts",
  void: "Void orders",
  refund: "Refund orders",
  voidRequiresPin: "Void requires PIN re-entry",
  refundRequiresPin: "Refund requires PIN re-entry",
  resetOwnPin: "Reset own PIN",
};

const allTrue: Permissions = {
  manageMenu: true,
  manageDeals: true,
  manageTables: true,
  manageCompany: true,
  manageUsers: true,
  viewReports: true,
  closeShift: true,
  discount: true,
  void: true,
  refund: true,
  voidRequiresPin: false,
  refundRequiresPin: false,
  resetOwnPin: true,
};

export const DEFAULT_PERMISSIONS: Record<Role, Permissions> = {
  ADMIN: { ...allTrue },
  MANAGER: {
    manageMenu: true,
    manageDeals: true,
    manageTables: true,
    manageCompany: false,
    manageUsers: false,
    viewReports: true,
    closeShift: true,
    discount: true,
    void: true,
    refund: true,
    voidRequiresPin: false,
    refundRequiresPin: false,
    resetOwnPin: true,
  },
  WAITER: {
    manageMenu: false,
    manageDeals: false,
    manageTables: false,
    manageCompany: false,
    manageUsers: false,
    viewReports: false,
    closeShift: false,
    discount: false,
    void: false,
    refund: false,
    voidRequiresPin: false,
    refundRequiresPin: false,
    resetOwnPin: true,
  },
};

export function resolvePermissions(role: string, stored?: unknown): Permissions {
  const base = DEFAULT_PERMISSIONS[role as Role] ?? DEFAULT_PERMISSIONS.WAITER;
  if (stored && typeof stored === "object") {
    return { ...base, ...(stored as Permissions) };
  }
  return { ...base };
}
