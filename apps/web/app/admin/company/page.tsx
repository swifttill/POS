import { db, companies, eq } from "@swift-till/db";
import { CompanyForm } from "@/components/admin/CompanyForm";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, "singleton"),
  });

  const data = {
    name: company?.name ?? "",
    address: company?.address ?? "",
    tagline: company?.tagline ?? "",
    currency: company?.currency ?? "PKR",
    gstEnabled: company?.gstEnabled ?? false,
    gstRate: company?.gstRate ?? 0,
    logoUrl: company?.logoUrl ?? "",
  };

  return (
    <div>
      <div className="page-heading"><div><div className="section-title mb-2.5">Organisation</div><h1 className="page-title">Company setup</h1><p className="page-subtitle">Manage receipt identity, tax settings, currency and restaurant branding.</p></div></div>
      <div className="card p-5 max-w-2xl">
        <CompanyForm initial={data} />
      </div>
    </div>
  );
}
