import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // In a real app, you'd verify against the user's stored PIN hash
    // For now, we check against the session's stored PIN (simplified)
    // The session should contain the user's PIN hash or we verify via DB
    // For demo, accept the PIN if it matches the session's known PIN
    // In production, use verifyPin(pin, user.pinHash)

    // Since we don't store PIN hash in session, we'll do a DB lookup
    const { db, users, eq } = await import("@swift-till/db");
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    });

    if (!user || !verifyPin(pin, user.pinHash)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unlock failed", err);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}