import { NextResponse } from "next/server";
import { prisma } from "@swift-till/db";
import { requirePermission, hashPin } from "@/lib/auth";
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
      permissions?: Partial<Permissions>;
    };
    const existing = await prisma.user.findUnique({ where: { id } });
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

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.role !== undefined ? { role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(permissions !== undefined ? { permissions } : {}),
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
    await prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/users/[id] failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
