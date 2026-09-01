import type { OrderType } from "./index.ts";

export type OpenOrderFinancialStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "PARTIALLY_REFUNDED" | "FULLY_REFUNDED";

export type ActiveTableLink = Readonly<{
  tableId: string;
  isPrimary: boolean;
}>;

export type OpenOrderState = Readonly<{
  id: string;
  type: OrderType;
  operationalStatus: "OPEN" | "CLOSED" | "VOIDED";
  financialStatus: OpenOrderFinancialStatus;
  version: number;
  pax?: number;
  waiterId?: string;
  deliveryAddress?: string;
  heldAt?: Date;
  tables: readonly ActiveTableLink[];
}>;

export type OpenOrderSummary = Readonly<{
  id: string;
  orderNumber: bigint;
  type: OrderType;
  financialStatus: OpenOrderFinancialStatus;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  waiterName?: string;
  openedAt: Date;
  updatedAt: Date;
  total: bigint;
  balanceDue: bigint;
  held: boolean;
}>;

export type OpenOrderFilter = Readonly<{
  query?: string;
  type?: OrderType;
  financialStatus?: "UNPAID" | "PARTIALLY_PAID";
  waiterName?: string;
  heldOnly?: boolean;
}>;

export function assertOpen(order: OpenOrderState): void {
  if (order.operationalStatus !== "OPEN") throw new Error("ORDER_NOT_OPEN");
}

export function assertVersion(order: OpenOrderState, expectedVersion: number): void {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("INVALID_ORDER_VERSION");
  if (order.version !== expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
}

export function assertCanCombine(order: OpenOrderState): void {
  assertOpen(order);
  if (order.financialStatus !== "UNPAID") throw new Error("COMBINE_REQUIRES_UNPAID_ORDER");
}

export function assertCanReleaseTable(order: OpenOrderState, tableId: string): void {
  assertOpen(order);
  if (order.type !== "DINE_IN") throw new Error("DINE_IN_REQUIRED");
  if (!order.tables.some(link => link.tableId === tableId)) throw new Error("TABLE_NOT_ASSIGNED_TO_ORDER");
  if (order.tables.length <= 1) throw new Error("LAST_TABLE_CANNOT_BE_UNMERGED");
}

export function validateTypeChangeTarget(nextType: OrderType, context: { tableId?: string; pax?: number; deliveryAddress?: string }): void {
  if (nextType === "DINE_IN") {
    if (!context.tableId) throw new Error("TABLE_REQUIRED");
    if (!Number.isInteger(context.pax) || (context.pax ?? 0) < 1 || (context.pax ?? 0) > 999) throw new Error("INVALID_PAX");
  }
  if (nextType === "DELIVERY" && !context.deliveryAddress?.trim()) throw new Error("DELIVERY_ADDRESS_REQUIRED");
}

export function filterOpenOrders(orders: readonly OpenOrderSummary[], filter: OpenOrderFilter): OpenOrderSummary[] {
  const query = filter.query?.trim().toLocaleLowerCase();
  return orders.filter(order => {
    if (filter.type && order.type !== filter.type) return false;
    if (filter.financialStatus && order.financialStatus !== filter.financialStatus) return false;
    if (filter.heldOnly && !order.held) return false;
    if (filter.waiterName && order.waiterName !== filter.waiterName) return false;
    if (!query) return true;
    return [order.orderNumber.toString(), order.tableName, order.customerName, order.customerPhone]
      .filter(Boolean)
      .some(value => value!.toLocaleLowerCase().includes(query));
  });
}

export function recentOrders(orders: readonly OpenOrderSummary[], limit = 20): OpenOrderSummary[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_RECENT_ORDER_LIMIT");
  return [...orders].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
}

export interface OrderManagementRepository {
  runSerializable<T>(work: (tx: OrderManagementTransaction) => Promise<T>): Promise<T>;
}

export interface OrderManagementTransaction {
  getOrderForUpdate(orderId: string): Promise<OpenOrderState>;
  assertTableAvailable(tableId: string, currentOrderId?: string): Promise<void>;
  markHeld(orderId: string, actorUserId: string): Promise<void>;
  clearHeld(orderId: string): Promise<void>;
  moveTable(orderId: string, sourceTableId: string, destinationTableId: string): Promise<void>;
  mergeTable(orderId: string, tableId: string): Promise<void>;
  unmergeTable(orderId: string, tableId: string): Promise<void>;
  transferWaiter(orderId: string, waiterId: string): Promise<void>;
  changeType(orderId: string, nextType: OrderType, context: { tableId?: string; pax?: number; deliveryAddress?: string }): Promise<void>;
  releaseAllTables(orderId: string): Promise<void>;
  combineOrders(destinationOrderId: string, sourceOrderId: string): Promise<void>;
  appendAudit(input: Readonly<{ action: string; entityId: string; actorUserId: string; metadata?: Record<string, unknown> }>): Promise<void>;
}

type VersionedCommand = Readonly<{ orderId: string; expectedVersion: number; actorUserId: string }>;

export async function holdOpenOrder(repository: OrderManagementRepository, command: VersionedCommand): Promise<void> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    await tx.markHeld(order.id, command.actorUserId);
    await tx.appendAudit({ action: "ORDER_HELD", entityId: order.id, actorUserId: command.actorUserId });
  });
}

export async function recallOpenOrder(repository: OrderManagementRepository, command: VersionedCommand): Promise<void> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    await tx.clearHeld(order.id);
    await tx.appendAudit({ action: "ORDER_RECALLED", entityId: order.id, actorUserId: command.actorUserId });
  });
}

export async function moveOrderTable(repository: OrderManagementRepository, command: VersionedCommand & { sourceTableId: string; destinationTableId: string }): Promise<void> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    if (order.type !== "DINE_IN") throw new Error("DINE_IN_REQUIRED");
    if (!order.tables.some(link => link.tableId === command.sourceTableId)) throw new Error("TABLE_NOT_ASSIGNED_TO_ORDER");
    if (command.sourceTableId === command.destinationTableId) throw new Error("TABLE_MOVE_SAME_DESTINATION");
    await tx.assertTableAvailable(command.destinationTableId, order.id);
    await tx.moveTable(order.id, command.sourceTableId, command.destinationTableId);
    await tx.appendAudit({ action: "TABLE_MOVED", entityId: order.id, actorUserId: command.actorUserId, metadata: { fromTableId: command.sourceTableId, toTableId: command.destinationTableId } });
  });
}

export async function mergeOrderTable(repository: OrderManagementRepository, command: VersionedCommand & { tableId: string }): Promise<void> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    if (order.type !== "DINE_IN") throw new Error("DINE_IN_REQUIRED");
    if (order.tables.some(link => link.tableId === command.tableId)) throw new Error("TABLE_ALREADY_ASSIGNED_TO_ORDER");
    await tx.assertTableAvailable(command.tableId, order.id);
    await tx.mergeTable(order.id, command.tableId);
    await tx.appendAudit({ action: "TABLE_MERGED", entityId: order.id, actorUserId: command.actorUserId, metadata: { tableId: command.tableId } });
  });
}

export async function unmergeOrderTable(repository: OrderManagementRepository, command: VersionedCommand & { tableId: string }): Promise<void> {
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertVersion(order, command.expectedVersion); assertCanReleaseTable(order, command.tableId);
    await tx.unmergeTable(order.id, command.tableId);
    await tx.appendAudit({ action: "TABLE_UNMERGED", entityId: order.id, actorUserId: command.actorUserId, metadata: { tableId: command.tableId } });
  });
}

export async function transferOpenOrder(repository: OrderManagementRepository, command: VersionedCommand & { waiterId: string }): Promise<void> {
  if (!command.waiterId.trim()) throw new Error("WAITER_REQUIRED");
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    await tx.transferWaiter(order.id, command.waiterId);
    await tx.appendAudit({ action: "ORDER_TRANSFERRED", entityId: order.id, actorUserId: command.actorUserId, metadata: { fromWaiterId: order.waiterId, toWaiterId: command.waiterId } });
  });
}

export async function changeOpenOrderType(repository: OrderManagementRepository, command: VersionedCommand & { nextType: OrderType; tableId?: string; pax?: number; deliveryAddress?: string }): Promise<void> {
  validateTypeChangeTarget(command.nextType, command);
  return repository.runSerializable(async tx => {
    const order = await tx.getOrderForUpdate(command.orderId);
    assertOpen(order); assertVersion(order, command.expectedVersion);
    if (command.nextType === "DINE_IN" && command.tableId) await tx.assertTableAvailable(command.tableId, order.id);
    if (order.type === "DINE_IN" && command.nextType !== "DINE_IN") await tx.releaseAllTables(order.id);
    await tx.changeType(order.id, command.nextType, { tableId: command.tableId, pax: command.pax, deliveryAddress: command.deliveryAddress?.trim() });
    await tx.appendAudit({ action: "ORDER_TYPE_CHANGED", entityId: order.id, actorUserId: command.actorUserId, metadata: { from: order.type, to: command.nextType } });
  });
}

export async function combineOpenOrders(repository: OrderManagementRepository, command: Readonly<{ destinationOrderId: string; sourceOrderId: string; destinationVersion: number; sourceVersion: number; actorUserId: string }>): Promise<void> {
  if (command.destinationOrderId === command.sourceOrderId) throw new Error("CANNOT_COMBINE_ORDER_WITH_ITSELF");
  return repository.runSerializable(async tx => {
    const destination = await tx.getOrderForUpdate(command.destinationOrderId);
    const source = await tx.getOrderForUpdate(command.sourceOrderId);
    assertVersion(destination, command.destinationVersion); assertVersion(source, command.sourceVersion);
    assertCanCombine(destination); assertCanCombine(source);
    await tx.combineOrders(destination.id, source.id);
    await tx.appendAudit({ action: "ORDERS_COMBINED", entityId: destination.id, actorUserId: command.actorUserId, metadata: { sourceOrderId: source.id } });
  });
}
