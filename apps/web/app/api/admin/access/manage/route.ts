import { requirePermission, effectivePermissions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { apiError } from "../../../../../lib/api-error";
import { json } from "../../../../../lib/json";

export async function POST(req: Request) {
  try {
    const s = await requirePermission("users.assign_roles");

    const b = (await req.json()) as {
      userId: string;
      roleIds: string[];
    };

    if (!b.userId || !Array.isArray(b.roleIds)) {
      throw Object.assign(new Error("INVALID_ACCESS_CHANGE"), {
        status: 422,
      });
    }

    const actor = await effectivePermissions();

    const roles = await db.role.findMany({
      where: {
        id: { in: b.roleIds },
        active: true,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    type RoleWithPermissions = (typeof roles)[number];
    type RolePermission = RoleWithPermissions["permissions"][number];

    const grants = new Set<string>(
      roles.flatMap((r: RoleWithPermissions) =>
        r.permissions.map((p: RolePermission) => p.permission.key)
      )
    );

    for (const k of grants) {
      if (!actor.permissions.has(k)) {
        throw Object.assign(
          new Error("CANNOT_GRANT_PERMISSION:" + k),
          { status: 403 }
        );
      }
    }

    const activeAdmins = await db.userRole.count({
      where: {
        role: {
          systemRole: "ADMIN",
          active: true,
        },
        user: {
          active: true,
        },
      },
    });

    const targetHasAdmin =
      (await db.userRole.count({
        where: {
          userId: b.userId,
          role: {
            systemRole: "ADMIN",
            active: true,
          },
        },
      })) > 0;

    const targetWillAdmin = roles.some(
      (r: RoleWithPermissions) => r.systemRole === "ADMIN"
    );

    if (activeAdmins === 1 && targetHasAdmin && !targetWillAdmin) {
      throw Object.assign(new Error("LAST_ADMIN_REQUIRED"), {
        status: 409,
      });
    }

    type TransactionClient = Omit<
      typeof db,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >;

    await db.$transaction(async (tx: TransactionClient) => {
      const before = await tx.userRole.findMany({
        where: {
          userId: b.userId,
        },
        select: {
          roleId: true,
        },
      });

      await tx.userRole.deleteMany({
        where: {
          userId: b.userId,
        },
      });

      if (b.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: b.roleIds.map((roleId: string) => ({
            userId: b.userId,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditEvent.create({
        data: {
          action: "USER_ROLES_CHANGED",
          entityType: "User",
          entityId: b.userId,
          actorUserId: s.userId,
          beforeSnapshot: before,
          afterSnapshot: {
            roleIds: b.roleIds,
          },
        },
      });
    });

    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
