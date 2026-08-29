import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";

export const dynamic = "force-dynamic";

// POST /api/orders/[id]/bill -> queue a customer-bill print on the billing printer.
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
    await prisma.order.update({
      where: { id },
      data: { billQueuedAt: new Date(), billPrinted: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/[id]/bill failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
