import test from "node:test";
import assert from "node:assert/strict";
import { assignUserRoles, createCustomRole, setUserPermissionOverride, type AccessRepository, type StoredRole, type StoredUserAccess } from "../src/access-service.ts";

class Repo implements AccessRepository{
  perms=["roles.manage","users.assign_roles","users.override_permissions","reports.item","orders.create"];
  roles=new Map<string,StoredRole>([["cash",{id:"cash",name:"Cashier",active:true,protected:false,permissions:["orders.create"]}],["admin",{id:"admin",name:"Admin",active:true,protected:true,permissions:this.perms}]]);
  users=new Map<string,StoredUserAccess>([["u1",{userId:"u1",active:true,roleIds:["admin"],effectivePermissions:this.perms,isAdmin:true}],["u2",{userId:"u2",active:true,roleIds:["cash"],effectivePermissions:["orders.create"],isAdmin:false}]]);
  audits:any[]=[]; overrides:any[]=[];
  async runSerializable<T>(w:(tx:AccessRepository)=>Promise<T>){return w(this)} async listPermissionKeys(){return this.perms}
  async getRoleForUpdate(id:string){return this.roles.get(id)??null} async findRoleByName(n:string){return [...this.roles.values()].find(r=>r.name===n)??null}
  async createRole(i:any){const r={id:`r${this.roles.size}`,name:i.name,description:i.description,active:i.active,protected:false,permissions:[]} as StoredRole;this.roles.set(r.id,r);return r}
  async updateRole(id:string,i:any){const old=this.roles.get(id)!;const r={...old,...i};this.roles.set(id,r);return r} async replaceRolePermissions(id:string,p:readonly string[]){const r=this.roles.get(id)!;this.roles.set(id,{...r,permissions:[...p]})}
  async getUserAccessForUpdate(id:string){return this.users.get(id)??null} async replaceUserRoles(id:string,roleIds:readonly string[]){const u=this.users.get(id)!;this.users.set(id,{...u,roleIds:[...roleIds]})}
  async upsertUserOverride(i:any){this.overrides.push(i)} async deleteUserOverride(userId:string,permission:string){this.overrides=this.overrides.filter(x=>!(x.userId===userId&&x.permission===permission))}
  async countActiveAdministrators(){return [...this.users.values()].filter(u=>u.isAdmin&&u.active).length} async wouldUserBeAdministrator(_u:string,roleIds:readonly string[]){return roleIds.includes("admin")}
  async writeAudit(i:any){this.audits.push(i)}
}
const full={userId:"u1",effectivePermissions:["roles.manage","users.assign_roles","users.override_permissions","reports.item","orders.create"]} as const;

test("creates a custom role only from permissions actor can grant",async()=>{const r=new Repo();const role=await createCustomRole(r,full,{name:"Auditor",active:true,permissions:["reports.item"]});assert.equal(role.name,"Auditor");assert.deepEqual(role.permissions,["reports.item"]);assert.equal(r.audits[0].action,"ROLE_CREATED")});
test("cannot create role with privilege actor lacks",async()=>{const r=new Repo();await assert.rejects(createCustomRole(r,{userId:"u2",effectivePermissions:["roles.manage"]},{name:"Cash Lead",active:true,permissions:["orders.create"]}),/CANNOT_GRANT_PERMISSION/)});
test("cannot remove final admin through role assignment",async()=>{const r=new Repo();await assert.rejects(assignUserRoles(r,full,"u1",["cash"]),/LAST_ADMIN_REQUIRED/)});
test("user override ALLOW requires actor to possess granted permission",async()=>{const r=new Repo();await assert.rejects(setUserPermissionOverride(r,{userId:"u2",effectivePermissions:["users.override_permissions"]},{userId:"u2",permission:"reports.item",effect:"ALLOW"}),/CANNOT_GRANT_PERMISSION/)});
test("user explicit DENY can be written and audited",async()=>{const r=new Repo();await setUserPermissionOverride(r,full,{userId:"u2",permission:"orders.create",effect:"DENY",reason:"Training"});assert.equal(r.overrides[0].effect,"DENY");assert.equal(r.audits[0].action,"USER_PERMISSION_OVERRIDE_CHANGED")});
