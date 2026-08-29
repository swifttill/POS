import { NextResponse } from "next/server";
import { db, orders, eq } from "@swift-till/db";
import { requirePermission, verifyPinForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/orders/[id]/void -> mark an order voided (excluded from reports).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("void");
    if (!user) {
      return NextResponse.json({ error: "Permission required to void" }, { status: 401 });
    }
    if (user.permissions.voidRequiresPin) {
      const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
      if (!pin || !(await verifyPinForUser(user.id, pin))) {
        return NextResponse.json(
          { error: "PIN re-entry required to void" },
          { status: 401 }
        );
      }
    }
    const { id } = await params;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.update(orders).set({ status: "VOIDED" }).where(eq(orders.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/[id]/void failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
