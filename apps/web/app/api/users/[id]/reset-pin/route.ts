import { NextResponse } from "next/server";
import { db, users, eq } from "@swift-till/db";
import { requirePermission, hashPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/reset-pin { pin } -> admin resets a user's PIN.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const { pin } = (await request.json()) as { pin?: string };
    if (!pin || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-8 digits" },
        { status: 400 }
      );
    }
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.update(users).set({ pinHash: hashPin(pin) }).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/users/[id]/reset-pin failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
