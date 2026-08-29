import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { requireManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/orders/[id]/refund -> manager-approved full refund.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await requireManager();
    if (!manager) {
      return NextResponse.json({ error: "Manager approval required" }, { status: 401 });
    }
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (order.status === "VOIDED" || order.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Order cannot be refunded" },
        { status: 400 }
      );
    }
    await prisma.order.update({
      where: { id },
      data: { status: "REFUNDED" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/[id]/refund failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
