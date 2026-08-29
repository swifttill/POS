import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // minimal valid wasm module (magic + version)
  const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
  const out: Record<string, unknown> = {};
  try {
    const m = new WebAssembly.Module(bytes);
    out.module = "ok";
  } catch (e) {
    out.module = String((e as Error).message);
  }
  try {
    const m = await WebAssembly.compile(bytes);
    out.compile = "ok";
  } catch (e) {
    out.compile = String((e as Error).message);
  }
  try {
    const raw = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const m = new WebAssembly.Module(raw.buffer);
    out.buffer = "ok";
  } catch (e) {
    out.buffer = String((e as Error).message);
  }
  out.webassemblyGlobal = typeof WebAssembly;
  out.globalWebassembly = typeof (globalThis as any).WebAssembly;
  return NextResponse.json(out);
}
