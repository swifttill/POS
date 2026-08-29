import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { requirePermission, hashPin } from "@/lib/auth";
import { DEFAULT_PERMISSIONS, type Permissions, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET /api/users -> list all users (manageUsers permission required).
export async function GET() {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/users failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/users -> create a user (manageUsers permission required).
export async function POST(request: Request) {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as {
      name?: string;
      pin?: string;
      role?: string;
      active?: boolean;
      permissions?: Partial<Permissions>;
    };
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.pin || !/^\d{4,8}$/.test(body.pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-8 digits" },
        { status: 400 }
      );
    }
    const role = (body.role as Role) ?? "WAITER";
    if (!DEFAULT_PERMISSIONS[role]) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const permissions: Permissions = {
      ...DEFAULT_PERMISSIONS[role],
      ...(body.permissions ?? {}),
    };
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        pinHash: hashPin(body.pin),
        role,
        active: body.active ?? true,
        permissions,
      },
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("POST /api/users failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
