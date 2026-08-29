import { NextResponse } from "next/server";
import { db, users, asc } from "@swift-till/db";
import { requirePermission, hashPin, hashPassword } from "@/lib/auth";
import { DEFAULT_PERMISSIONS, type Permissions, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET /api/users -> list all users (manageUsers permission required).
export async function GET() {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const list = await db.query.users.findMany({
      orderBy: asc(users.createdAt),
      columns: {
        id: true,
        name: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ users: list });
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
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
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
    if (body.password && body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const data = {
      name: body.name.trim(),
      pinHash: hashPin(body.pin),
      role,
      active: body.active ?? true,
      permissions,
      ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
      ...(body.username ? { username: body.username.trim() } : {}),
      ...(body.email ? { email: body.email.trim().toLowerCase() } : {}),
      ...(body.phone ? { phone: body.phone.trim() } : {}),
    };
    const user = await db
      .insert(users)
      .values(data)
      .returning({
        id: users.id,
        name: users.name,
        role: users.role,
        active: users.active,
        permissions: users.permissions,
        createdAt: users.createdAt,
      });
    return NextResponse.json({ user: user[0] });
  } catch (err) {
    console.error("POST /api/users failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
