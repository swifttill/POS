import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function createDbClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaNeon({
    connectionString,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

/**
 * Cloudflare Workers reuse isolates across requests.
 * Never retain Prisma/Neon I/O state globally.
 *
 * Existing routes can continue importing `db`, but each Prisma
 * operation resolves against a fresh client created inside the
 * active request context.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = createDbClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function"
      ? value.bind(client)
      : value;
  },
});
