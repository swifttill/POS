"use client";

import { useEffect, useState } from "react";
import {
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
  resolvePermissions,
  type Permission,
  type Permissions,
  type Role,
} from "@/lib/permissions";

type UserRow = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  permissions: Permissions | null;
  createdAt: string;
};

const PERMS = Object.keys(PERMISSION_LABELS) as Permission[];
const ROLES: Role[] = ["ADMIN", "MANAGER", "WAITER"];

function permsFrom(role: Role, stored?: Permissions | null): Permissions {
  return resolvePermissions(role, stored ?? undefined);
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  // modal state
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);

  // form state
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("WAITER");
  const [active, setActive] = useState(true);
  const [pin, setPin] = useState("");
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMISSIONS.WAITER);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/users");
    if (res.status === 403) {
      setDenied(true);
      return;
    }
    if (!res.ok) return;
    const d = await res.json();
    setUsers(d.users);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setError(null);
    setEditing(null);
    setCreating(true);
    setName("");
    setRole("WAITER");
    setActive(true);
    setPin("");
    setPerms(DEFAULT_PERMISSIONS.WAITER);
  }

  function openEdit(u: UserRow) {
    setError(null);
    setCreating(false);
    setEditing(u);
    setName(u.name);
    setRole(u.role);
    setActive(u.active);
    setPin("");
    setPerms(permsFrom(u.role, u.permissions));
  }

  function onRoleChange(r: Role) {
    setRole(r);
    // Re-default permissions to the chosen role when switching.
    setPerms(DEFAULT_PERMISSIONS[r]);
  }

  function togglePerm(p: Permission) {
    setPerms((prev) => ({ ...prev, [p]: !prev[p] }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = editing
        ? await fetch(`/api/users/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, role, active, permissions: perms }),
          })
        : await fetch(`/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, pin, role, active, permissions: perms }),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed");
        setBusy(false);
        return;
      }
      setCreating(false);
      setEditing(null);
      setBusy(false);
      await load();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  async function deactivate(u: UserRow) {
    if (!confirm(`Deactivate ${u.name}? They won't be able to log in.`)) return;
    await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    await load();
  }

  async function resetPin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${resetFor!.id}/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed");
        setBusy(false);
        return;
      }
      setResetFor(null);
      setPin("");
      setBusy(false);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (denied) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">
          You don&apos;t have permission to manage users. Ask an admin to grant
          the <b>manageUsers</b> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Users</h1>
          <p className="text-sm text-muted">
            Manage staff accounts, roles and permissions.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary px-4 py-2">
          + Add user
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-brand-soft text-brand text-xs font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-danger">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-brand/50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setResetFor(u);
                        setPin("");
                        setError(null);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-line hover:border-brand/50"
                    >
                      Reset PIN
                    </button>
                    {u.active ? (
                      <button
                        onClick={() => deactivate(u)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-line text-danger hover:border-danger/50"
                      >
                        Disable
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {(creating || editing) ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-ink">
              {editing ? `Edit ${editing.name}` : "Add user"}
            </h2>
            <div className="space-y-4 mt-4">
              <div>
                <label className="section-title">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full mt-1 px-3 py-2"
                  placeholder="e.g. Ahmed Khan"
                />
              </div>
              <div>
                <label className="section-title">Role</label>
                <select
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value as Role)}
                  className="input w-full mt-1 px-3 py-2"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="section-title">
                  {editing ? "New PIN (leave blank to keep)" : "PIN (4-8 digits)"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="input w-full mt-1 px-3 py-2 tracking-[0.4em] text-center"
                  placeholder="••••"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Active (can log in)
              </label>

              <div>
                <label className="section-title">Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {PERMS.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm bg-surface-2 border border-line rounded-lg px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={perms[p]}
                        onChange={() => togglePerm(p)}
                      />
                      <span>{PERMISSION_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={busy || !name || (!editing && !pin)}
                  className="btn-primary flex-1 py-2 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reset PIN modal */}
      {resetFor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lg space-y-3">
            <h2 className="text-lg font-semibold text-ink">
              Reset PIN — {resetFor.name}
            </h2>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="New PIN (4-8 digits)"
              className="input w-full text-center tracking-[0.4em] text-lg py-2.5"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setResetFor(null)}
                className="btn-secondary flex-1 py-2"
              >
                Cancel
              </button>
              <button
                onClick={resetPin}
                disabled={busy || !pin}
                className="btn-primary flex-1 py-2 disabled:opacity-50"
              >
                {busy ? "…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
