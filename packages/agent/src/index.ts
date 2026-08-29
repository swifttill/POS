import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Order, type OrderItem } from "../../db/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { EscPos } from "./escpos";
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

const prismaPool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(prismaPool) });
const outboxDir = config.outboxDir || "outbox";

function targetFor(station: string): string {
  return (
    config.printers?.[station] ||
    config.defaults?.[station] ||
    "file"
  );
}

function buildKOT(
  companyName: string,
  station: string,
  order: Order,
  items: Array<OrderItem & { modifiers: { name: string }[] }>
): Buffer {
  const p = new EscPos().init();
  p.align("center").large(true).bold(true).text(companyName).large(false).bold(false);
  p.line(`*** ${station} KOT ***`);
  p.hr();
  p.align("left");
  const tag = `#${order.id.slice(0, 8)} ${order.type}${
    order.tableId ? ` (table ${order.tableId})` : ""
  }`;
  p.line(tag);
  p.line(new Date(order.createdAt).toLocaleString());
  if (order.waiterName) p.line(`Waiter: ${order.waiterName}`);
  if (order.pax) p.line(`Pax: ${order.pax}`);
  p.hr();
  for (const it of items) {
    p.bold(true).text(`${it.quantity}x ${it.name}`).bold(false);
    if (it.seat) p.text(`  (Seat ${it.seat})`);
    p.line();
    for (const m of it.modifiers) p.text(`   + ${m.name}`);
    if (it.notes) p.text(`   " ${it.notes} "`);
  }
  p.hr();
  p.align("center").text("*** END OF TICKET ***");
  p.feed(3).cut();
  return p.toBuffer();
}

async function pollOnce() {
  const company = await prisma.company.findFirst({ where: { id: "singleton" } });
  const companyName = company?.name ?? "SwiftTill";

  const orders = await prisma.order.findMany({
    where: { kotPrinted: false },
    include: {
      items: { include: { modifiers: true } },
      table: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const order of orders) {
    try {
      // Group items by printer station.
      const byStation = new Map<
        string,
        Array<OrderItem & { modifiers: { name: string }[] }>
      >();
      for (const it of order.items) {
        const key = it.station;
        if (!byStation.has(key)) byStation.set(key, []);
        byStation.get(key)!.push(it);
      }

      let printedAny = false;
      for (const [station, items] of byStation.entries()) {
        const ticket = buildKOT(companyName, station, order, items);
        await sendToPrinter(
          targetFor(station),
          `kot-${order.id.slice(0, 8)}-${station}`,
          ticket,
          outboxDir
        );
        printedAny = true;
      }

      if (printedAny) {
        await prisma.order.update({
          where: { id: order.id },
          data: { kotPrinted: true },
        });
        console.log(`KOT printed for order ${order.id.slice(0, 8)}`);
      }
    } catch (err) {
      console.error(`Failed to print order ${order.id.slice(0, 8)}:`, err);
    }
  }
}

// Billing printer: prints the customer bill to the dedicated billing printer
// for any order whose bill has been queued (billQueuedAt set, not yet printed).
async function printBills() {
  const company = await prisma.company.findFirst({ where: { id: "singleton" } });
  const companyName = company?.name ?? "SwiftTill";
  const currency = company?.currency ?? "PKR";

  const orders = await prisma.order.findMany({
    where: { billQueuedAt: { not: null }, billPrinted: false },
    include: {
      items: { include: { modifiers: true } },
      payments: true,
    },
    orderBy: { billQueuedAt: "asc" },
  });

  for (const order of orders) {
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
      await prisma.order.update({
        where: { id: order.id },
        data: { billPrinted: true },
      });
      console.log(`Bill printed for order ${order.id.slice(0, 8)}`);
    } catch (err) {
      console.error(`Failed to print bill ${order.id.slice(0, 8)}:`, err);
    }
  }
}

async function main() {
  console.log("SwiftTill print agent started.");
  console.log(`Polling every ${config.pollIntervalMs}ms.`);
  await pollOnce();
  await printBills();
  setInterval(() => {
    pollOnce().catch((e) => console.error("poll error", e));
    printBills().catch((e) => console.error("bill poll error", e));
  }, config.pollIntervalMs || 3000);
}

main().catch((e) => {
  console.error("Agent crashed:", e);
  process.exit(1);
});
