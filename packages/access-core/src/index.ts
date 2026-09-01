export type OverrideEffect = "ALLOW" | "DENY";

export type PermissionOverride = Readonly<{
  permission: string;
  effect: OverrideEffect;
}>;

export type RoleGrant = Readonly<{
  roleId: string;
  roleName: string;
  active: boolean;
  permissions: readonly string[];
}>;

export type EffectiveAccessInput = Readonly<{
  roles: readonly RoleGrant[];
  overrides: readonly PermissionOverride[];
}>;

export type EffectivePermission = Readonly<{
  permission: string;
  allowed: boolean;
  source: "USER_DENY" | "USER_ALLOW" | "ROLE" | "DEFAULT_DENY";
  roleNames: readonly string[];
}>;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Resolution order is intentionally strict:
 * explicit user DENY > explicit user ALLOW > any active role grant > default DENY.
 */
export function resolvePermission(input: EffectiveAccessInput, permission: string): EffectivePermission {
  const relevantOverrides = input.overrides.filter((x) => x.permission === permission);
  if (relevantOverrides.some((x) => x.effect === "DENY")) {
    return { permission, allowed: false, source: "USER_DENY", roleNames: [] };
  }
  if (relevantOverrides.some((x) => x.effect === "ALLOW")) {
    return { permission, allowed: true, source: "USER_ALLOW", roleNames: [] };
  }
  const roles = input.roles.filter((r) => r.active && r.permissions.includes(permission));
  if (roles.length) {
    return { permission, allowed: true, source: "ROLE", roleNames: unique(roles.map((r) => r.roleName)) };
  }
  return { permission, allowed: false, source: "DEFAULT_DENY", roleNames: [] };
}

export function resolveEffectivePermissions(input: EffectiveAccessInput): readonly EffectivePermission[] {
  const permissionKeys = unique([
    ...input.roles.flatMap((r) => [...r.permissions]),
    ...input.overrides.map((o) => o.permission)
  ]).sort();
  return permissionKeys.map((permission) => resolvePermission(input, permission));
}

export type RoleDraft = Readonly<{
  name: string;
  description?: string | null;
  permissions: readonly string[];
  active: boolean;
}>;

export function validateRoleDraft(draft: RoleDraft, knownPermissions: readonly string[]): RoleDraft {
  const name = draft.name.trim();
  if (name.length < 2 || name.length > 60) throw new Error("ROLE_NAME_INVALID");
  const known = new Set(knownPermissions);
  const unknown = draft.permissions.filter((p) => !known.has(p));
  if (unknown.length) throw new Error(`UNKNOWN_PERMISSION:${unknown[0]}`);
  return { ...draft, name, permissions: unique(draft.permissions).sort() };
}

export function assertActorCanGrant(actorEffective: readonly string[], requested: readonly string[]): void {
  const allowed = new Set(actorEffective);
  const forbidden = requested.find((p) => !allowed.has(p));
  if (forbidden) throw new Error(`CANNOT_GRANT_PERMISSION:${forbidden}`);
}

export function cloneRole(source: RoleDraft, newName: string): RoleDraft {
  return validateRoleDraft(
    { ...source, name: newName, permissions: [...source.permissions], active: true },
    source.permissions
  );
}

export function assertLastAdministratorPreserved(input: Readonly<{
  currentActiveAdmins: number;
  targetCurrentlyAdmin: boolean;
  targetWillRemainAdmin: boolean;
}>): void {
  if (input.currentActiveAdmins < 1) throw new Error("NO_ACTIVE_ADMIN");
  if (input.currentActiveAdmins === 1 && input.targetCurrentlyAdmin && !input.targetWillRemainAdmin) {
    throw new Error("LAST_ADMIN_REQUIRED");
  }
}

export type AccessChange = Readonly<{
  actorUserId: string;
  targetType: "USER" | "ROLE";
  targetId: string;
  before: unknown;
  after: unknown;
  reason?: string | null;
}>;

export function buildAccessAudit(change: AccessChange) {
  if (!change.actorUserId || !change.targetId) throw new Error("ACCESS_AUDIT_ID_REQUIRED");
  return Object.freeze({
    action: "ACCESS_CHANGED",
    entityType: change.targetType,
    entityId: change.targetId,
    actorUserId: change.actorUserId,
    beforeSnapshot: change.before,
    afterSnapshot: change.after,
    reason: change.reason?.trim() || null
  });
}
export * from "./access-service.ts";
