import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { verifyPin, verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { resolvePermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// POST /api/auth/login
// Body (staff PIN):        { pin }
// Body (account login):    { identifier, password }
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pin?: string;
      identifier?: string;
      password?: string;
    };

    // --- Staff PIN login ---
    if (body.pin && !body.identifier) {
      if (!/^\d{4,8}$/.test(body.pin)) {
        return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
      }
      const users = await prisma.user.findMany({ where: { active: true } });
      let matched = null as (typeof users)[number] | null;
      for (const u of users) {
        if (verifyPin(body.pin, u.pinHash)) {
          matched = u;
          break;
        }
      }
      if (!matched) {
        return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
      }
      const token = await createSession(matched.id);
      await setSessionCookie(token);
      return NextResponse.json({
        ok: true,
        method: "pin",
        role: matched.role,
        name: matched.name,
        permissions: resolvePermissions(matched.role, matched.permissions),
      });
    }

    // --- Account login (username / email / phone + password) ---
    const identifier = (body.identifier ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Enter your username/email/phone and password" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findFirst({
      where: {
        active: true,
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      method: "password",
      role: user.role,
      name: user.name,
      permissions: resolvePermissions(user.role, user.permissions),
    });
  } catch (err) {
    console.error("POST /api/auth/login failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed", detail: msg.slice(0, 300) }, { status: 500 });
  }
}

export const runtime = "nodejs";
