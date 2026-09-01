# SwiftTill rc.3 — Custom Role & User Access Management

## Objective
SwiftTill uses server-authoritative RBAC with per-user overrides. Admin/Manager/Cashier/Waiter remain useful templates, but the product is not limited to those roles. Operators can create roles such as Supervisor, Senior Cashier, Accountant or Auditor and choose granular permissions.

## Effective access resolution
For every permission key, resolve in this exact order:

1. Explicit user `DENY` → deny.
2. Explicit user `ALLOW` → allow.
3. Any active assigned role grants permission → allow.
4. Otherwise → deny by default.

A user may have multiple roles. Role grants are additive, but an explicit user DENY always wins.

## Security invariants
- UI visibility is not authorization. Every API command checks effective access server-side.
- An actor cannot grant a permission they do not themselves possess.
- The final active administrator cannot be stripped of administrator access or deactivated accidentally.
- Built-in/system roles are protected from unsafe disable/delete operations; they may be used as templates for clones.
- High-risk actions have distinct permissions: taking payment is separate from correcting payment; creating a refund is separate from approving one; closing own shift is separate from closing any shift; viewing reports is separate from export.
- Access changes write immutable `AuditEvent` before/after snapshots with actor, target and reason.
- PIN hashes are never exposed in access-management reads.
- Session revocation is a separate permission and operation.

## Role management workflow
`Create role → validate name/permissions → verify actor grant boundary → save role + grants transactionally → audit`.

Role edit follows the same pattern and supports role cloning. A role change affects all assigned users except where explicit user overrides alter a particular permission.

## User management workflow
A user can have multiple roles. User-specific permission state is tri-state:
- `INHERIT`: remove override and use roles.
- `ALLOW`: explicitly grant permission.
- `DENY`: explicitly block permission, even if a role grants it.

Typical example:

```
User: Ahmed
Roles: Cashier
reports.item = ALLOW
refunds.create = DENY
```

Ahmed inherits normal Cashier access, receives Item/PMIX reporting, and cannot create refunds even if a future Cashier role update grants that permission.

## API contract
Suggested authoritative endpoints:
- `GET /api/access/permissions`
- `GET /api/access/roles`
- `POST /api/access/roles`
- `PATCH /api/access/roles/:roleId`
- `POST /api/access/roles/:roleId/clone`
- `GET /api/access/users`
- `GET /api/access/users/:userId/effective`
- `PUT /api/access/users/:userId/roles`
- `PUT /api/access/users/:userId/permissions/:permissionKey` with `ALLOW | DENY | INHERIT`
- `POST /api/access/users/:userId/reset-pin`
- `POST /api/access/users/:userId/revoke-sessions`
- `GET /api/access/audit`

All writes execute transactionally with authenticated `actorUserId`; callers never submit a trusted actor ID in request bodies.

## UI
`/admin/access` contains:
- Roles & Permissions
- Users & Overrides
- Access Audit

The role editor groups permissions operationally and supports search, select-all/clear, per-group selection, clone, and detailed permission descriptions. User overrides clearly expose the `Inherit / Allow / Deny` model.
