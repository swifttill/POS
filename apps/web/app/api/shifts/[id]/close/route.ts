import { NextResponse } from "next/server";
import { db, shifts, eq } from "@swift-till/db";
import { buildReport } from "@/lib/reports";
import { authorize } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/shifts/[id]/close -> close shift and return Z-report.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize("closeShift");
    if (auth.status === 401) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.status === 403) {
      return NextResponse.json(
        { error: "Permission required to close a shift" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cashEnd = body.cashEnd != null ? Math.round(Number(body.cashEnd)) : null;

    const existing = await db.query.shifts.findFirst({ where: eq(shifts.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const [shift] = await db
      .update(shifts)
      .set({ closedAt: new Date(), cashEnd })
      .where(eq(shifts.id, id))
      .returning();

    const report = await buildReport({ shiftId: id });

    return NextResponse.json({ shift, report });
  } catch (err) {
    console.error("POST /api/shifts/[id]/close failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
