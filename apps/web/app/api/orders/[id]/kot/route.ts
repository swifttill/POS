import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";

export const dynamic = "force-dynamic";

// POST /api/orders/[id]/kot -> re-queue the kitchen ticket for reprinting.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.order.update({ where: { id }, data: { kotPrinted: false } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/[id]/kot failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
