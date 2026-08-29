import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@swift-till/db";
import crypto from "crypto";
import {
  resolvePermissions,
  type Permissions,
  type Permission,
} from "./permissions";

export const SESSION_COOKIE = "st_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(pin, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

// Account passwords use the same scrypt primitive (works on any string).
export function hashPassword(p: string): string {
  return hashPin(p);
}
export function verifyPassword(p: string, stored: string): boolean {
  return verifyPin(p, stored);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export interface SessionUser {
  id: string;
  name: string;
  role: string;
  permissions: Permissions;
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const { user } = session;
  if (!user.active) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    permissions: resolvePermissions(user.role, user.permissions),
  };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

export async function requireManager(): Promise<SessionUser | null> {
  const user = await getSession();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") return null;
  return user;
}

export async function requirePermission(
  perm: Permission
): Promise<SessionUser | null> {
  const user = await getSession();
  if (!user) return null;
  if (!user.permissions[perm]) return null;
  return user;
}

// Verify a PIN against a specific user's stored hash (used for
// re-entry confirmation on sensitive actions like void/refund).
export async function verifyPinForUser(
  userId: string,
  pin: string
): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return false;
  return verifyPin(pin, u.pinHash);
}
