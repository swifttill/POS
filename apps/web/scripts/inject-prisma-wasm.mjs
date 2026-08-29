// Injects the Prisma query-compiler wasm as a directly-imported ES module into
// the OpenNext worker so Cloudflare precompiles it at upload time. Workerd
// forbids runtime WASM code generation, so we cannot compile from bytes; an
// imported module is precompiled and can be `WebAssembly.instantiate`d at runtime.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // apps/web/scripts
const webDir = path.resolve(scriptDir, ".."); // apps/web
const openNextDir = path.join(webDir, ".open-next");

const wasmSrc = path.join(webDir, "public", "prisma", "query_compiler_bg.postgresql.wasm");
const wasmDest = path.join(openNextDir, "prisma_compiler.wasm");
const workerFile = path.join(openNextDir, "worker.js");

if (!fs.existsSync(wasmSrc)) {
  console.warn("[inject-prisma-wasm] source wasm not found at", wasmSrc, "- skipping");
  process.exit(0);
}
if (!fs.existsSync(workerFile)) {
  console.warn("[inject-prisma-wasm] .open-next/worker.js not found - run build first");
  process.exit(0);
}

fs.mkdirSync(openNextDir, { recursive: true });
fs.copyFileSync(wasmSrc, wasmDest);
console.log("[inject-prisma-wasm] copied wasm ->", wasmDest);

let worker = fs.readFileSync(workerFile, "utf8");
const marker = "// __PRISMA_WASM_INJECTED__";
if (!worker.includes(marker)) {
  const prelude = `import { PRISMA_WASM as __prismaWasmModule } from "./prisma_compiler.wasm";\n${marker}\nglobalThis.__PRISMA_WASM__ = __prismaWasmModule;\n`;
  // Insert after the first line so any "use strict"/shebang is preserved.
  const nl = worker.indexOf("\n");
  if (nl === -1) {
    worker = prelude + worker;
  } else {
    worker = worker.slice(0, nl + 1) + prelude + worker.slice(nl + 1);
  }
  fs.writeFileSync(workerFile, worker);
  console.log("[inject-prisma-wasm] injected wasm import into worker.js");
} else {
  console.log("[inject-prisma-wasm] worker.js already patched");
}
