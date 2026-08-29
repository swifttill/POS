import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The Neon serverless driver talks to Postgres over HTTPS (no TCP/sockets),
// so it works on Cloudflare Workers. Strip any query string (e.g. ?sslmode=)
// because the HTTP driver negotiates TLS itself.
// Provide a non-empty placeholder when the env var is absent so that importing
// this module during `next build` (when DATABASE_URL is not set) does not
// throw. Real requests run on Cloudflare Workers where DATABASE_URL is present.
const raw = process.env.DATABASE_URL ?? "";
const connectionString = raw.replace(/\?.*$/, "") || "postgresql://user:pass@localhost:5432/db";

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export * from "./schema";
export { createId } from "./schema";

// Re-export a few ergonomic helpers used across the app.
export { and, or, eq, ne, gt, gte, lt, lte, inArray, notInArray, like, asc, desc, sql, isNull, isNotNull } from "drizzle-orm";
