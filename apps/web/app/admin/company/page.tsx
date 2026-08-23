import { prisma } from "@swift-till/db";
import { CompanyForm } from "@/components/admin/CompanyForm";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const company = await prisma.company.findFirst({
    where: { id: "singleton" },
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
      <h1 className="text-2xl font-bold glow-text mb-1">Company Setup</h1>
      <p className="text-muted text-sm mb-6">
        Defines your receipt header, tax rules, and branding.
      </p>
      <div className="card p-5 max-w-2xl">
        <CompanyForm initial={data} />
      </div>
    </div>
  );
}
