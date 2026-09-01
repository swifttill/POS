import test from "node:test";
import assert from "node:assert/strict";
import { assertActorCanGrant, assertLastAdministratorPreserved, buildAccessAudit, cloneRole, resolvePermission, validateRoleDraft } from "../src/index.ts";

const cashier = { roleId:"r1", roleName:"Cashier", active:true, permissions:["orders.create","payments.create"] } as const;

test("role grants permission",()=>{
  const r=resolvePermission({roles:[cashier],overrides:[]},"payments.create");
  assert.equal(r.allowed,true); assert.equal(r.source,"ROLE");
});

test("explicit user ALLOW can add permission absent from role",()=>{
  const r=resolvePermission({roles:[cashier],overrides:[{permission:"reports.item",effect:"ALLOW"}]},"reports.item");
  assert.equal(r.allowed,true); assert.equal(r.source,"USER_ALLOW");
});

test("explicit user DENY wins over role and allow",()=>{
  const r=resolvePermission({roles:[cashier],overrides:[{permission:"payments.create",effect:"ALLOW"},{permission:"payments.create",effect:"DENY"}]},"payments.create");
  assert.equal(r.allowed,false); assert.equal(r.source,"USER_DENY");
});

test("inactive roles grant nothing",()=>{
  const r=resolvePermission({roles:[{...cashier,active:false}],overrides:[]},"payments.create");
  assert.equal(r.allowed,false); assert.equal(r.source,"DEFAULT_DENY");
});

test("custom role validates known permissions and deduplicates",()=>{
  const r=validateRoleDraft({name:" Senior Cashier ",active:true,permissions:["orders.create","orders.create"]},["orders.create"]);
  assert.equal(r.name,"Senior Cashier"); assert.deepEqual(r.permissions,["orders.create"]);
});

test("unknown role permission rejected",()=>{
  assert.throws(()=>validateRoleDraft({name:"Auditor",active:true,permissions:["root.shell"]},["reports.audit"]),/UNKNOWN_PERMISSION/);
});

test("actor cannot grant permission they do not possess",()=>{
  assert.throws(()=>assertActorCanGrant(["users.manage"],["roles.manage"]),/CANNOT_GRANT_PERMISSION/);
});

test("last active administrator cannot be removed",()=>{
  assert.throws(()=>assertLastAdministratorPreserved({currentActiveAdmins:1,targetCurrentlyAdmin:true,targetWillRemainAdmin:false}),/LAST_ADMIN_REQUIRED/);
});

test("role clone preserves permissions with new name",()=>{
  const r=cloneRole({name:"Cashier",active:true,permissions:["orders.create"],description:null},"Senior Cashier");
  assert.equal(r.name,"Senior Cashier"); assert.deepEqual(r.permissions,["orders.create"]);
});

test("access changes create immutable audit payload",()=>{
  const a=buildAccessAudit({actorUserId:"admin1",targetType:"USER",targetId:"u1",before:{roles:["Cashier"]},after:{roles:["Manager"]},reason:"Promotion"});
  assert.equal(a.action,"ACCESS_CHANGED"); assert.equal(a.reason,"Promotion"); assert.equal(Object.isFrozen(a),true);
});
