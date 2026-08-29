import { NextResponse } from "next/server";
import { db, users, eq } from "@swift-till/db";
import { requirePermission, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/reset-password { password } -> admin resets a user's password.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const { password } = (await request.json()) as { password?: string };
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/users/[id]/reset-password failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
