import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";

export const dynamic = "force-dynamic";

// GET current open shift (closedAt is null), if any.
export async function GET() {
  try {
    const shift = await prisma.shift.findFirst({
      where: { closedAt: null },
      orderBy: { openedAt: "desc" },
    });
    return NextResponse.json({ shift });
  } catch (err) {
    console.error("GET /api/shifts failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST open a new shift.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const openedBy = (body.openedBy as string) || null;
    const cashStart = Math.round(Number(body.cashStart ?? 0));

    const open = await prisma.shift.findFirst({
      where: { closedAt: null },
    });
    if (open) {
      return NextResponse.json(
        { error: "A shift is already open", shift: open },
        { status: 409 }
      );
    }

    const shift = await prisma.shift.create({
      data: { openedBy, cashStart, name: new Date().toISOString().slice(0, 10) },
    });
    return NextResponse.json({ shift });
  } catch (err) {
    console.error("POST /api/shifts failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
