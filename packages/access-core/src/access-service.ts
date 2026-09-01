import { assertActorCanGrant, assertLastAdministratorPreserved, validateRoleDraft, type OverrideEffect, type RoleDraft } from "./index.ts";

export type AccessActor = Readonly<{ userId:string; effectivePermissions:readonly string[] }>;
export type StoredRole = Readonly<{ id:string; name:string; description?:string|null; active:boolean; protected:boolean; permissions:readonly string[] }>;
export type StoredUserAccess = Readonly<{ userId:string; active:boolean; roleIds:readonly string[]; effectivePermissions:readonly string[]; isAdmin:boolean }>;

export interface AccessRepository {
  runSerializable<T>(work:(tx:AccessRepository)=>Promise<T>):Promise<T>;
  listPermissionKeys():Promise<readonly string[]>;
  getRoleForUpdate(roleId:string):Promise<StoredRole|null>;
  findRoleByName(name:string):Promise<StoredRole|null>;
  createRole(input:RoleDraft):Promise<StoredRole>;
  updateRole(roleId:string,input:RoleDraft):Promise<StoredRole>;
  replaceRolePermissions(roleId:string,permissions:readonly string[]):Promise<void>;
  getUserAccessForUpdate(userId:string):Promise<StoredUserAccess|null>;
  replaceUserRoles(userId:string,roleIds:readonly string[]):Promise<void>;
  upsertUserOverride(input:{userId:string;permission:string;effect:OverrideEffect;grantedById:string;reason?:string|null}):Promise<void>;
  deleteUserOverride(userId:string,permission:string):Promise<void>;
  countActiveAdministrators():Promise<number>;
  wouldUserBeAdministrator(userId:string,roleIds:readonly string[]):Promise<boolean>;
  writeAudit(input:{action:string;entityType:string;entityId:string;actorUserId:string;beforeSnapshot:unknown;afterSnapshot:unknown;reason?:string|null}):Promise<void>;
}

function requireManageRoles(actor:AccessActor){ if(!actor.effectivePermissions.includes("roles.manage")) throw new Error("FORBIDDEN:roles.manage"); }
function requireAssignRoles(actor:AccessActor){ if(!actor.effectivePermissions.includes("users.assign_roles")) throw new Error("FORBIDDEN:users.assign_roles"); }
function requireOverride(actor:AccessActor){ if(!actor.effectivePermissions.includes("users.override_permissions")) throw new Error("FORBIDDEN:users.override_permissions"); }

export async function createCustomRole(repo:AccessRepository,actor:AccessActor,draft:RoleDraft):Promise<StoredRole>{
  requireManageRoles(actor);
  return repo.runSerializable(async tx=>{
    const known=await tx.listPermissionKeys();
    const clean=validateRoleDraft(draft,known);
    assertActorCanGrant(actor.effectivePermissions,clean.permissions);
    if(await tx.findRoleByName(clean.name)) throw new Error("ROLE_NAME_EXISTS");
    const role=await tx.createRole(clean);
    await tx.replaceRolePermissions(role.id,clean.permissions);
    await tx.writeAudit({action:"ROLE_CREATED",entityType:"ROLE",entityId:role.id,actorUserId:actor.userId,beforeSnapshot:null,afterSnapshot:clean});
    return {...role,permissions:clean.permissions};
  });
}

export async function updateCustomRole(repo:AccessRepository,actor:AccessActor,roleId:string,draft:RoleDraft):Promise<StoredRole>{
  requireManageRoles(actor);
  return repo.runSerializable(async tx=>{
    const before=await tx.getRoleForUpdate(roleId); if(!before) throw new Error("ROLE_NOT_FOUND");
    const known=await tx.listPermissionKeys(); const clean=validateRoleDraft(draft,known);
    assertActorCanGrant(actor.effectivePermissions,clean.permissions);
    const sameName=await tx.findRoleByName(clean.name); if(sameName && sameName.id!==roleId) throw new Error("ROLE_NAME_EXISTS");
    if(before.protected && !clean.active) throw new Error("PROTECTED_ROLE_CANNOT_DISABLE");
    const after=await tx.updateRole(roleId,clean); await tx.replaceRolePermissions(roleId,clean.permissions);
    await tx.writeAudit({action:"ROLE_UPDATED",entityType:"ROLE",entityId:roleId,actorUserId:actor.userId,beforeSnapshot:before,afterSnapshot:{...after,permissions:clean.permissions}});
    return {...after,permissions:clean.permissions};
  });
}

export async function assignUserRoles(repo:AccessRepository,actor:AccessActor,userId:string,roleIds:readonly string[],reason?:string):Promise<void>{
  requireAssignRoles(actor);
  await repo.runSerializable(async tx=>{
    const before=await tx.getUserAccessForUpdate(userId); if(!before) throw new Error("USER_NOT_FOUND");
    const unique=[...new Set(roleIds)];
    // Prevent role assignment from indirectly granting privileges the actor does not hold.
    for(const roleId of unique){ const role=await tx.getRoleForUpdate(roleId); if(!role || !role.active) throw new Error("ROLE_NOT_ASSIGNABLE"); assertActorCanGrant(actor.effectivePermissions,role.permissions); }
    const activeAdmins=await tx.countActiveAdministrators();
    const afterAdmin=await tx.wouldUserBeAdministrator(userId,unique);
    assertLastAdministratorPreserved({currentActiveAdmins:activeAdmins,targetCurrentlyAdmin:before.isAdmin,targetWillRemainAdmin:afterAdmin});
    await tx.replaceUserRoles(userId,unique);
    await tx.writeAudit({action:"USER_ROLES_CHANGED",entityType:"USER",entityId:userId,actorUserId:actor.userId,beforeSnapshot:{roleIds:before.roleIds},afterSnapshot:{roleIds:unique},reason});
  });
}

export async function setUserPermissionOverride(repo:AccessRepository,actor:AccessActor,input:{userId:string;permission:string;effect:OverrideEffect|"INHERIT";reason?:string|null}):Promise<void>{
  requireOverride(actor);
  await repo.runSerializable(async tx=>{
    const user=await tx.getUserAccessForUpdate(input.userId); if(!user) throw new Error("USER_NOT_FOUND");
    const known=await tx.listPermissionKeys(); if(!known.includes(input.permission)) throw new Error("UNKNOWN_PERMISSION");
    if(input.effect==="ALLOW") assertActorCanGrant(actor.effectivePermissions,[input.permission]);
    if(input.effect==="INHERIT") await tx.deleteUserOverride(input.userId,input.permission);
    else await tx.upsertUserOverride({userId:input.userId,permission:input.permission,effect:input.effect,grantedById:actor.userId,reason:input.reason});
    await tx.writeAudit({action:"USER_PERMISSION_OVERRIDE_CHANGED",entityType:"USER",entityId:input.userId,actorUserId:actor.userId,beforeSnapshot:null,afterSnapshot:{permission:input.permission,effect:input.effect},reason:input.reason});
  });
}
