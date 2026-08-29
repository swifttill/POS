import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSession, clearSession } from "@/lib/auth";
import ChangePinButton from "@/components/ChangePinButton";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await clearSession();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-4">
          <Logo size={28} />
          <span className="text-xs uppercase tracking-widest text-muted">
            Admin
          </span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Dashboard
          </Link>
          <Link href="/admin/menu" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Menu
          </Link>
          <Link href="/admin/deals" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Deals
          </Link>
          <Link href="/admin/company" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Company
          </Link>
          <Link href="/admin/reports" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Reports
          </Link>
          <Link href="/admin/shifts" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Shifts
          </Link>
          <Link href="/admin/users" className="px-3 py-1.5 rounded-lg hover:bg-panel-2">
            Users
          </Link>
          <span className="ml-2 px-3 py-1.5 text-muted">
            {user.name} · <span className="uppercase">{user.role}</span>
          </span>
          {user.permissions.resetOwnPin ? <ChangePinButton /> : null}
          <form action={logout}>
            <button className="ml-1 px-3 py-1.5 rounded-lg border border-line hover:border-electric/50">
              Logout
            </button>
          </form>
          <Link href="/" className="ml-2 px-3 py-1.5 rounded-lg btn-primary">
            POS →
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}

export const runtime = "nodejs";
