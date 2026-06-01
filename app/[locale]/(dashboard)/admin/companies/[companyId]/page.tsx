export const dynamic = "force-dynamic";

import { verifySession } from "@/lib/auth/auth";
import { redirect, notFound } from "next/navigation";
import {
  getCompanyForPlatformAdmin,
  getPlatformPlans,
} from "../actions";
import { CompanyAdminDetailView } from "../_components/company-admin-detail-view";

export default async function CompanyAdminDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await verifySession();
  if (!session.isPlatformSuperAdmin) {
    redirect("/dashboard");
  }

  const { companyId } = await params;
  const [company, plans] = await Promise.all([
    getCompanyForPlatformAdmin(companyId),
    getPlatformPlans(),
  ]);

  if (!company) notFound();

  return <CompanyAdminDetailView company={company} plans={plans} />;
}
