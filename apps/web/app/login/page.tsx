import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/admin");
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold glow-text mb-1">SwiftTill</h1>
        <p className="text-sm text-muted mb-5">Sign in with your PIN</p>
        <LoginForm />
      </div>
    </main>
  );
}
