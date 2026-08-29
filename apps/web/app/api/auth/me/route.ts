import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me -> current logged-in user (for client-side gating).
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    },
  });
}

export const runtime = "nodejs";
