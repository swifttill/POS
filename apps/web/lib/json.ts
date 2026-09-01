import { NextResponse } from "next/server";
export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control":"no-store", ...(init?.headers ?? {}) } });
}
export function safe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,safe(v)]));
  return value;
}
