import { db } from "@swift-till/db";
import { getSession } from "@/lib/auth";
import { SettingsHub } from "@/components/admin/SettingsHub";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [company, user] = await Promise.all([
    db.query.companies.findFirst(),
    getSession(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold glow-text mb-1">Settings</h1>
      <p className="text-muted text-sm mb-6">
        Organisation, profile and optional POS features in one place.
      </p>
      <SettingsHub
        company={{
          name: company?.name ?? "SwiftTill Restaurant",
          logoUrl: company?.logoUrl ?? "",
          gstEnabled: company?.gstEnabled ?? false,
          gstRate: company?.gstRate ?? 0,
        }}
        user={{
          name: user?.name ?? "Staff",
          role: user?.role ?? "WAITER",
        }}
      />
    </div>
  );
}
