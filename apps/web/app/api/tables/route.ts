import { NextResponse } from "next/server";
import { db, restaurantTables, asc } from "@swift-till/db";

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

export const runtime = "nodejs";
