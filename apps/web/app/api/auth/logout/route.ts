import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout -> destroy the session and clear the cookie.
export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/logout failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
