import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // packages/db/scripts
const dbPkgDir = path.resolve(scriptDir, ".."); // packages/db
const repoRoot = path.resolve(dbPkgDir, "..", "..");

// 1) Locate the real query-compiler wasm shipped inside the prisma package.
const candidates = [];
function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name === "query_compiler_bg.postgresql.wasm") candidates.push(full);
  }
}
walk(path.join(repoRoot, "node_modules", ".pnpm"));

if (candidates.length === 0) {
  console.warn("[patch-prisma-wasm] wasm not found; skipping asset copy");
} else {
  const wasmSrc = candidates[0];
  const destDir = path.join(repoRoot, "apps", "web", "public", "prisma");
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(wasmSrc, path.join(destDir, "query_compiler_bg.postgresql.wasm"));
  console.log("[patch-prisma-wasm] copied wasm ->", path.join(destDir, "query_compiler_bg.postgresql.wasm"));
}

// 2) Patch the generated client so the query-compiler wasm is fetched from the
//    Worker's ASSETS binding (not inlined as base64). Falls back to a runtime
//    dynamic import for local Node development.
const classFile = path.join(
  dbPkgDir,
  "src",
  "generated",
  "prisma",
  "internal",
  "class.ts"
);
if (!fs.existsSync(classFile)) {
  console.warn("[patch-prisma-wasm] generated class.ts not found; skipping");
  process.exit(0);
}

let src = fs.readFileSync(classFile, "utf8");
const needle =
  'const { wasm } = await import("@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs")\n    return await decodeBase64AsWasm(wasm)';

if (!src.includes(needle)) {
  console.warn("[patch-prisma-wasm] target pattern not found; skipping patch");
  process.exit(0);
}

const replacement = `const wasmPath = "/prisma/query_compiler_bg.postgresql.wasm"
    const assets = (globalThis as any).ASSETS
    if (assets && typeof assets.fetch === "function") {
      const res = await assets.fetch(new Request("https://prisma.local" + wasmPath))
      if (!res.ok) throw new Error("prisma wasm asset load failed: " + res.status)
      return new WebAssembly.Module(new Uint8Array(await res.arrayBuffer()))
    }
    const origin = process.env.PRISMA_WASM_ORIGIN
    if (origin) {
      const res = await fetch(origin + wasmPath)
      if (!res.ok) throw new Error("prisma wasm fetch failed: " + res.status)
      return new WebAssembly.Module(new Uint8Array(await res.arrayBuffer()))
    }
    const spec = "@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs"
    const mod = await import(spec)
    return await decodeBase64AsWasm(mod.wasm)`;

src = src.replace(needle, replacement);
fs.writeFileSync(classFile, src);
console.log("[patch-prisma-wasm] patched getQueryCompilerWasmModule to use ASSETS");
