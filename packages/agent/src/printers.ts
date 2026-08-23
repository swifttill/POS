// Printer transport for the local agent.
// Target formats (from agent.config.json "printers"):
//   "file"                    -> write raw ESC/POS bytes to <outboxDir>/<name>.bin
//   "tcp://host:9100"         -> raw TCP print (thermal network printers)
//   "null"                    -> discard (just log)
// Windows shared printers can be reached via a local raw-TCP proxy or by
// mapping to a tcp:// target; "file" outbox is the portable default.

import net from "node:net";
import fs from "node:fs";
import path from "node:path";

export async function sendToPrinter(
  target: string,
  name: string,
  buffer: Buffer,
  outboxDir: string
): Promise<void> {
  const t = (target || "file").trim();

  if (t === "null") {
    console.log(`  [print:null] ${name} (${buffer.length} bytes) — discarded`);
    return;
  }

  if (t === "file" || t.startsWith("file://")) {
    const dir = path.resolve(process.cwd(), outboxDir);
    fs.mkdirSync(dir, { recursive: true });
    const safe = name.replace(/[^a-z0-9_.-]/gi, "_");
    const file = path.join(dir, `${safe}.bin`);
    fs.writeFileSync(file, buffer);
    console.log(`  [print:file] ${name} -> ${file}`);
    return;
  }

  if (t.startsWith("tcp://")) {
    const url = t.slice("tcp://".length);
    const [host, portStr] = url.split(":");
    const port = Number(portStr || 9100);
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect(port, host, () => {
        socket.write(buffer, () => {
          socket.end();
          console.log(`  [print:tcp] ${name} -> ${host}:${port}`);
          resolve();
        });
      });
      socket.on("error", (err) => {
        console.error(`  [print:tcp] FAILED ${name} -> ${host}:${port}:`, err.message);
        reject(err);
      });
      // Don't hang forever.
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error("printer timeout"));
      });
    });
    return;
  }

  throw new Error(`Unknown printer target: ${t}`);
}
