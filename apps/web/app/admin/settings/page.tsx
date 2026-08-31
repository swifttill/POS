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
      <div className="page-heading"><div><div className="section-title mb-2.5">Preferences</div><h1 className="page-title">Settings</h1><p className="page-subtitle">Control profile, security and optional POS behaviour from one place.</p></div></div>
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
