import { cartGrossSubtotal, validateOrderContext, type PosLine, type PosOrderDraft } from "./index.ts";

export type CreateOrderCommand = Readonly<{
  type: PosOrderDraft["type"];
  tableId?: string;
  pax?: number;
  customerId?: string;
  deliveryAddress?: string;
  lines: readonly PosLine[];
}>;

export type CreatedOrder = Readonly<{
  id: string;
  orderNumber: bigint;
  version: number;
  grossSubtotal: bigint;
}>;

/**
 * Transaction boundary required from the persistence adapter. Production Prisma/PostgreSQL
 * implementation must lock/check the table and commit order + assignment + snapshots together.
 */
export interface PosOrderRepository {
  runSerializable<T>(work: (tx: PosOrderTransaction) => Promise<T>): Promise<T>;
}

export interface PosOrderTransaction {
  assertTableAvailable(tableId: string): Promise<void>;
  createOrder(input: CreateOrderCommand & { grossSubtotal: bigint }): Promise<CreatedOrder>;
  assignTable(orderId: string, tableId: string, isPrimary: boolean): Promise<void>;
}

export async function createOpenOrder(repository: PosOrderRepository, command: CreateOrderCommand): Promise<CreatedOrder> {
  const draft: PosOrderDraft = { ...command, lines: command.lines };
  validateOrderContext(draft);
  const grossSubtotal = cartGrossSubtotal(command.lines);

  return repository.runSerializable(async tx => {
    if (command.type === "DINE_IN" && command.tableId) await tx.assertTableAvailable(command.tableId);
    const order = await tx.createOrder({ ...command, grossSubtotal });
    if (command.type === "DINE_IN" && command.tableId) await tx.assignTable(order.id, command.tableId, true);
    return order;
  });
}
