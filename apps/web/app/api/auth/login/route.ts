import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { verifyPin, createSession, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login { pin } -> create a session and set the cookie.
export async function POST(request: Request) {
  try {
    const { pin } = (await request.json()) as { pin?: string };
    if (!pin) {
      return NextResponse.json({ error: "PIN required" }, { status: 400 });
    }
    const users = await prisma.user.findMany({ where: { active: true } });
    let matched: (typeof users)[number] | null = null;
    for (const u of users) {
      if (verifyPin(pin, u.pinHash)) {
        matched = u;
        break;
      }
    }
    if (!matched) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
    const token = await createSession(matched.id);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, role: matched.role, name: matched.name });
  } catch (err) {
    console.error("POST /api/auth/login failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
