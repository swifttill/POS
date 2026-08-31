import { NextResponse } from "next/server";
import { db, shifts, isNull, desc } from "@swift-till/db";
import { authorize } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET current open shift (closedAt is null), if any.
export async function GET() {
  try {
    const shift = await db.query.shifts.findFirst({
      where: isNull(shifts.closedAt),
      orderBy: desc(shifts.openedAt),
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
    const auth = await authorize("closeShift");
    if (auth.status === 401) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.status === 403) {
      return NextResponse.json(
        { error: "Permission required to open a shift" },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const openedBy = (body.openedBy as string) || null;
    const cashStart = Math.round(Number(body.cashStart ?? 0));

    const open = await db.query.shifts.findFirst({
      where: isNull(shifts.closedAt),
    });
    if (open) {
      return NextResponse.json(
        { error: "A shift is already open", shift: open },
        { status: 409 }
      );
    }

    const [shift] = await db
      .insert(shifts)
      .values({ openedBy, cashStart, name: new Date().toISOString().slice(0, 10) })
      .returning();
    return NextResponse.json({ shift });
  } catch (err) {
    console.error("POST /api/shifts failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
