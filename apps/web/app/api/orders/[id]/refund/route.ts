import { NextResponse } from "next/server";
import { db, orders, eq } from "@swift-till/db";
import { authorize, verifyPinForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/orders/[id]/refund -> permission-gated full refund.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize("refund");
    if (auth.status === 401) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.status === 403) {
      return NextResponse.json(
        { error: "Permission required to process refunds" },
        { status: 403 }
      );
    }
    const user = auth.user!;
    if (user.permissions.refundRequiresPin) {
      const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
      if (!pin || !(await verifyPinForUser(user.id, pin))) {
        return NextResponse.json(
          { error: "PIN re-entry required to refund" },
          { status: 401 }
        );
      }
    }
    const { id } = await params;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (order.status === "VOIDED" || order.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Order cannot be refunded" },
        { status: 400 }
      );
    }
    await db.update(orders).set({ status: "REFUNDED" }).where(eq(orders.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/[id]/refund failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
