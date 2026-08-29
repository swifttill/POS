import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/");
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold">
            ST
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink leading-none">SwiftTill</h1>
            <p className="text-xs text-muted mt-1">Restaurant Point of Sale</p>
          </div>
        </div>
        <p className="text-sm text-muted mb-5 mt-3">Sign in with your PIN to continue.</p>
        <LoginForm />
      </div>
    </main>
  );
}

export const runtime = "nodejs";
