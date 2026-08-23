import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { buildReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

// POST /api/shifts/[id]/close -> close shift and return Z-report.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cashEnd = body.cashEnd != null ? Math.round(Number(body.cashEnd)) : null;

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: { closedAt: new Date(), cashEnd },
    });

    const report = await buildReport({ shiftId: id });

    return NextResponse.json({ shift, report });
  } catch (err) {
    console.error("POST /api/shifts/[id]/close failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
