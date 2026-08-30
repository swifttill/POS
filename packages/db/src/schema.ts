// SwiftTill POS — Drizzle schema (mirrors the Postgres tables 1:1).
// All monetary values are stored as integer paisa (1/100 of a PKR rupee).
// Column names are camelCase to match the existing Prisma-created database.
import {
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  pgTable,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

// "Enum" columns are stored as native Postgres enums; we model them as text
// here to avoid drizzle-kit push friction, with TS unions for safety.
export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus = "OPEN" | "BILLED" | "CLOSED" | "VOIDED" | "REFUNDED";
export type TenderType = "CASH" | "CARD" | "ONLINE";
export type Station = "BAR" | "GRILL" | "FRY" | "MAIN" | "DESSERT" | "EXPO";
export type DealType = "BOGO" | "BUNDLE" | "PERCENT";

export const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  username: text("username"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("WAITER"),
  pinHash: text("pinHash").notNull(),
  passwordHash: text("passwordHash"),
  permissions: jsonb("permissions").$type<Record<string, boolean> | null>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "Session",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    token: text("token").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("Session_token_unique").on(t.token),
  })
);

export const companies = pgTable("Company", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull().default("SwiftTill Restaurant"),
  address: text("address"),
  logoUrl: text("logoUrl"),
  tagline: text("tagline"),
  currency: text("currency").notNull().default("PKR"),
  gstEnabled: boolean("gstEnabled").notNull().default(false),
  gstRate: doublePrecision("gstRate").notNull().default(0),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const categories = pgTable(
  "Category",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    imageUrl: text("imageUrl"),
    // Self-referential FK (parent category) already exists in the database;
    // omit the inline reference here to avoid a circular type-inference error.
    parentId: text("parentId"),
  },
  (t) => ({
    slugUnique: uniqueIndex("Category_slug_unique").on(t.slug),
  })
);

export const menuItems = pgTable(
  "MenuItem",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    imageUrl: text("imageUrl"),
    available: boolean("available").notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
    printerStation: text("printerStation").notNull().default("MAIN"),
    categoryId: text("categoryId")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => ({
    categoryIdx: index("MenuItem_category_idx").on(t.categoryId),
  })
);

export const modifierGroups = pgTable(
  "ModifierGroup",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    minSelect: integer("minSelect").notNull().default(0),
    maxSelect: integer("maxSelect").notNull().default(1),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    menuItemId: text("menuItemId")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
  },
  (t) => ({
    itemIdx: index("ModifierGroup_item_idx").on(t.menuItemId),
  })
);

export const modifiers = pgTable(
  "Modifier",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    priceDelta: integer("priceDelta").notNull().default(0),
    sortOrder: integer("sortOrder").notNull().default(0),
    modifierGroupId: text("modifierGroupId")
      .notNull()
      .references(() => modifierGroups.id, { onDelete: "cascade" }),
  },
  (t) => ({
    groupIdx: index("Modifier_group_idx").on(t.modifierGroupId),
  })
);

export const deals = pgTable("Deal", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  type: text("type").notNull(),
  value: integer("value").notNull().default(0),
  active: boolean("active").notNull().default(true),
  startsAt: timestamp("startsAt", { mode: "date" }),
  endsAt: timestamp("endsAt", { mode: "date" }),
});

export const dealItems = pgTable(
  "DealItem",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    dealId: text("dealId")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    menuItemId: text("menuItemId")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => ({
    dealIdx: index("DealItem_deal_idx").on(t.dealId),
    itemIdx: index("DealItem_item_idx").on(t.menuItemId),
  })
);

export const restaurantTables = pgTable(
  "RestaurantTable",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    number: integer("number").notNull(),
    name: text("name"),
    seats: integer("seats").notNull().default(2),
    zone: text("zone"),
    posX: integer("posX").notNull().default(0),
    posY: integer("posY").notNull().default(0),
  },
  (t) => ({
    numberUnique: uniqueIndex("RestaurantTable_number_unique").on(t.number),
  })
);

export const orders = pgTable(
  "Order",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    number: integer("number").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("OPEN"),
    tableId: text("tableId").references(() => restaurantTables.id, { onDelete: "set null" }),
    pax: integer("pax"),
    waiterName: text("waiterName"),
    customerName: text("customerName"),
    customerPhone: text("customerPhone"),
    customerAddress: text("customerAddress"),
    subtotal: integer("subtotal").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull().default(0),
    discountPaisa: integer("discountPaisa").notNull().default(0),
    discountReason: text("discountReason"),
    discountBy: text("discountBy"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    billedAt: timestamp("billedAt", { mode: "date" }),
    closedAt: timestamp("closedAt", { mode: "date" }),
    kotPrinted: boolean("kotPrinted").notNull().default(false),
    billPrinted: boolean("billPrinted").notNull().default(false),
    billQueuedAt: timestamp("billQueuedAt", { mode: "date" }),
    shiftId: text("shiftId").references(() => shifts.id, { onDelete: "set null" }),
  },
  (t) => ({
    statusIdx: index("Order_status_idx").on(t.status),
    typeIdx: index("Order_type_idx").on(t.type),
    createdIdx: index("Order_createdAt_idx").on(t.createdAt),
  })
);

export const orderItems = pgTable(
  "OrderItem",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: text("menuItemId").references(() => menuItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    unitPrice: integer("unitPrice").notNull(),
    quantity: integer("quantity").notNull().default(1),
    seat: integer("seat"),
    course: integer("course").notNull().default(1),
    notes: text("notes"),
    station: text("station").notNull().default("MAIN"),
  },
  (t) => ({
    orderIdx: index("OrderItem_order_idx").on(t.orderId),
  })
);

export const orderItemModifiers = pgTable(
  "OrderItemModifier",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    orderItemId: text("orderItemId")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("priceDelta").notNull().default(0),
  },
  (t) => ({
    orderItemIdx: index("OrderItemModifier_item_idx").on(t.orderItemId),
  })
);

export const payments = pgTable(
  "Payment",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    orderId: text("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tender: text("tender").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("Payment_order_idx").on(t.orderId),
  })
);

export const shifts = pgTable("Shift", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  openedAt: timestamp("openedAt", { mode: "date" }).notNull().defaultNow(),
  closedAt: timestamp("closedAt", { mode: "date" }),
  openedBy: text("openedBy"),
  cashStart: integer("cashStart").notNull().default(0),
  cashEnd: integer("cashEnd"),
});

// Relations (for convenience with .with in queries).
export const usersRelations = relations(users, ({ many }) => ({ sessions: many(sessions) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  items: many(menuItems),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
  children: many(categories),
}));
export const menuItemsRelations = relations(menuItems, ({ many, one }) => ({
  modifierGroups: many(modifierGroups),
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
}));
export const modifierGroupsRelations = relations(modifierGroups, ({ many, one }) => ({
  modifiers: many(modifiers),
  menuItem: one(menuItems, { fields: [modifierGroups.menuItemId], references: [menuItems.id] }),
}));
export const modifiersRelations = relations(modifiers, ({ one }) => ({
  group: one(modifierGroups, { fields: [modifiers.modifierGroupId], references: [modifierGroups.id] }),
}));
export const dealsRelations = relations(deals, ({ many }) => ({ items: many(dealItems) }));
export const dealItemsRelations = relations(dealItems, ({ one }) => ({
  deal: one(deals, { fields: [dealItems.dealId], references: [deals.id] }),
  menuItem: one(menuItems, { fields: [dealItems.menuItemId], references: [menuItems.id] }),
}));
export const restaurantTablesRelations = relations(restaurantTables, ({ many }) => ({ orders: many(orders) }));
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  table: one(restaurantTables, { fields: [orders.tableId], references: [restaurantTables.id] }),
  shift: one(shifts, { fields: [orders.shiftId], references: [shifts.id] }),
}));
export const orderItemsRelations = relations(orderItems, ({ many, one }) => ({
  modifiers: many(orderItemModifiers),
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));
export const orderItemModifiersRelations = relations(orderItemModifiers, ({ one }) => ({
  orderItem: one(orderItems, { fields: [orderItemModifiers.orderItemId], references: [orderItems.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const shiftsRelations = relations(shifts, ({ many }) => ({ orders: many(orders) }));

export type UserRow = InferSelectModel<typeof users>;
export type SessionRow = InferSelectModel<typeof sessions>;
export type CompanyRow = InferSelectModel<typeof companies>;
export type CategoryRow = InferSelectModel<typeof categories>;
export type MenuItemRow = InferSelectModel<typeof menuItems>;
export type ModifierGroupRow = InferSelectModel<typeof modifierGroups>;
export type ModifierRow = InferSelectModel<typeof modifiers>;
export type DealRow = InferSelectModel<typeof deals>;
export type DealItemRow = InferSelectModel<typeof dealItems>;
export type RestaurantTableRow = InferSelectModel<typeof restaurantTables>;
export type OrderRow = InferSelectModel<typeof orders>;
export type OrderItemRow = InferSelectModel<typeof orderItems>;
export type OrderItemModifierRow = InferSelectModel<typeof orderItemModifiers>;
export type PaymentRow = InferSelectModel<typeof payments>;
export type ShiftRow = InferSelectModel<typeof shifts>;
