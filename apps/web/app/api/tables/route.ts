import { NextResponse } from "next/server";
import { db, restaurantTables, eq, asc } from "@swift-till/db";
import { requireManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await db.query.restaurantTables.findMany({
      orderBy: [asc(restaurantTables.zone), asc(restaurantTables.number)],
      columns: {
        id: true,
        number: true,
        name: true,
        seats: true,
        zone: true,
        posX: true,
        posY: true,
      },
    });
    return NextResponse.json({ tables });
  } catch (err) {
    console.error("GET /api/tables failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const manager = await requireManager();
    if (!manager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      number: number;
      name?: string | null;
      seats?: number;
      zone?: string | null;
      posX?: number;
      posY?: number;
    };
    if (!body.number || body.number < 1) {
      return NextResponse.json({ error: "Table number required" }, { status: 400 });
    }
    const [table] = await db
      .insert(restaurantTables)
      .values({
        number: body.number,
        name: body.name ?? null,
        seats: body.seats ?? 2,
        zone: body.zone ?? "Floor",
        posX: body.posX ?? 0,
        posY: body.posY ?? 0,
      })
      .returning();
    return NextResponse.json({ table });
  } catch (err) {
    console.error("POST /api/tables failed", err);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}

export const runtime = "nodejs";
