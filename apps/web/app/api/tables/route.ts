import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await prisma.restaurantTable.findMany({
      orderBy: [{ zone: "asc" }, { number: "asc" }],
      select: {
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
