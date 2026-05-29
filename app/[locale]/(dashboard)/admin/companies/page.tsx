export const dynamic = "force-dynamic";

import { verifySession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  getPlatformPlans,
  getPlatformBillingSetting,
  getPlatformSubscriptionInvoices,
  getCompaniesForPlatformAdmin,
  getMyCompanyMemberships,
} from "./actions";
import { CompaniesAdminView } from "./_components/companies-admin-view";

export default async function AdminCompaniesPage() {
  const session = await verifySession();
  if (!session.isPlatformSuperAdmin) {
    redirect("/dashboard");
  }

  const [companies, memberships, plans, invoices, billingSetting] = await Promise.all([
    getCompaniesForPlatformAdmin(),
    getMyCompanyMemberships(),
    getPlatformPlans(),
    getPlatformSubscriptionInvoices(),
    getPlatformBillingSetting(),
  ]);

  return (
    <CompaniesAdminView
      companies={companies}
      memberships={memberships}
      plans={plans}
      invoices={invoices}
      billingSetting={billingSetting}
      activeCompanyId={session.activeCompanyId}
      impersonatedCompanyId={session.impersonatedCompanyId}
    />
  );
}
