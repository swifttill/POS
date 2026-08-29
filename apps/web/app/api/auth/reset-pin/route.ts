import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { getSession, hashPin, verifyPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/reset-pin { currentPin, newPin } -> self reset (resetOwnPin required).
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.permissions.resetOwnPin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { currentPin, newPin } = (await request.json()) as {
      currentPin?: string;
      newPin?: string;
    };
    if (!currentPin || !/^\d{4,8}$/.test(newPin ?? "")) {
      return NextResponse.json(
        { error: "New PIN must be 4-8 digits" },
        { status: 400 }
      );
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!verifyPin(currentPin, dbUser.pinHash)) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(newPin) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-pin failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
