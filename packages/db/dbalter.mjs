import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.CS);
await sql`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "number" integer`;
await sql`UPDATE "Order" SET "number" = sub.rn FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn FROM "Order") sub WHERE "Order".id = sub.id`;
await sql`ALTER TABLE "Order" ALTER COLUMN "number" SET NOT NULL`;
const n = await sql`SELECT COUNT(*)::int AS c, MAX("number") AS m FROM "Order"`;
console.log('Order rows:', n[0].c, 'max number:', n[0].m);
