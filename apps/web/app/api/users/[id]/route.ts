import { NextResponse } from "next/server";
import { db, users, eq } from "@swift-till/db";
import { requirePermission, hashPin, hashPassword } from "@/lib/auth";
import { DEFAULT_PERMISSIONS, type Permissions, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// PATCH /api/users/[id] -> update name/role/active/permissions (manageUsers required).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      role?: string;
      active?: boolean;
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
      permissions?: Partial<Permissions>;
    };
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const role = (body.role as Role) ?? (existing.role as Role);
    if (!DEFAULT_PERMISSIONS[role]) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // When role changes and no explicit permissions supplied, re-default.
    const permissions: Permissions | undefined =
      body.permissions !== undefined
        ? { ...DEFAULT_PERMISSIONS[role], ...body.permissions }
        : role !== existing.role
          ? { ...DEFAULT_PERMISSIONS[role] }
          : undefined;

    const user = await db
      .update(users)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.role !== undefined ? { role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.username !== undefined
          ? { username: body.username ? body.username.trim() : null }
          : {}),
        ...(body.email !== undefined
          ? { email: body.email ? body.email.trim().toLowerCase() : null }
          : {}),
        ...(body.phone !== undefined
          ? { phone: body.phone ? body.phone.trim() : null }
          : {}),
        ...(body.password
          ? { passwordHash: hashPassword(body.password) }
          : {}),
        ...(permissions !== undefined ? { permissions } : {}),
      })
      .where(eq(users.id, id))
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
    console.error("PATCH /api/users/[id] failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/users/[id] -> deactivate (soft) a user (manageUsers required).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manageUsers");
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    await db.update(users).set({ active: false }).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/users/[id] failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
