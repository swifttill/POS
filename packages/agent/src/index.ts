import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBill } from "./bill";
import { sendToPrinter } from "./printers";

// Load repo-root .env so DATABASE_URL (local or Neon) is available.
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
  override: true,
});

interface AgentConfig {
  pollIntervalMs: number;
  databaseUrl?: string;
  outboxDir: string;
  billPrinter?: string;
  printers: Record<string, string>;
  defaults?: Record<string, string>;
}

const configPath = path.resolve(process.cwd(), "agent.config.json");
const config: AgentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (config.databaseUrl) {
  process.env.DATABASE_URL = config.databaseUrl;
}

// Dynamic import AFTER env is resolved so the Drizzle client (which reads
// DATABASE_URL at construction time) picks up config.databaseUrl when set.
const {
  db,
  orders,
  companies,
  eq,
  asc,
  and,
  isNotNull,
} = await import("@swift-till/db");

const outboxDir = config.outboxDir || "outbox";

// Billing printer: prints the customer bill to the dedicated billing printer
// for any order whose bill has been queued (billQueuedAt set, not yet printed).
async function printBills() {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, "singleton") });
  const companyName = company?.name ?? "SwiftTill";
  const currency = company?.currency ?? "PKR";

  const orderList = await db.query.orders.findMany({
    where: and(isNotNull(orders.billQueuedAt), eq(orders.billPrinted, false)),
    orderBy: asc(orders.billQueuedAt),
    with: {
      items: { with: { modifiers: true } },
      payments: true,
    },
  });

  for (const order of orderList) {
    try {
      const ticket = buildBill(
        companyName,
        order,
        order.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          seat: it.seat,
        })),
        order.payments.map((p) => ({ tender: p.tender, amount: p.amount })),
        currency
      );
      await sendToPrinter(
        config.billPrinter || "file",
        `bill-${order.id.slice(0, 8)}`,
        ticket,
        outboxDir
      );
      await db.update(orders).set({ billPrinted: true }).where(eq(orders.id, order.id));
      console.log(`Bill printed for order ${order.id.slice(0, 8)}`);
    } catch (err) {
      console.error(`Failed to print bill ${order.id.slice(0, 8)}:`, err);
    }
  }
}

async function main() {
  console.log("SwiftTill print agent started.");
  console.log(`Polling every ${config.pollIntervalMs}ms.`);
  await printBills();
  setInterval(() => {
    printBills().catch((e) => console.error("bill poll error", e));
  }, config.pollIntervalMs || 3000);
}

main().catch((e) => {
  console.error("Agent crashed:", e);
  process.exit(1);
});
