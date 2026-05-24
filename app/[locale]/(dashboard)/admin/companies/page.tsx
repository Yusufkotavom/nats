export const dynamic = "force-dynamic";

import { verifySession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  getCompaniesForPlatformAdmin,
  getMyCompanyMemberships,
} from "./actions";
import { CompaniesAdminView } from "./_components/companies-admin-view";

export default async function AdminCompaniesPage() {
  const session = await verifySession();
  if (!session.isPlatformSuperAdmin) {
    redirect("/dashboard");
  }

  const [companies, memberships] = await Promise.all([
    getCompaniesForPlatformAdmin(),
    getMyCompanyMemberships(),
  ]);

  return (
    <CompaniesAdminView
      companies={companies}
      memberships={memberships}
      activeCompanyId={session.activeCompanyId}
      impersonatedCompanyId={session.impersonatedCompanyId}
    />
  );
}

