import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/reset-password { currentPassword, newPassword } -> logged-in user changes own password.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { error: "No password set; ask an admin to reset it" },
        { status: 400 }
      );
    }
    if (!verifyPassword(currentPassword, dbUser.passwordHash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-password failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
