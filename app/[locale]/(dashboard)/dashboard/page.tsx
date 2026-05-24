export const dynamic = "force-dynamic";

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { getMainDashboardStats } from "./actions";
import { DashboardView } from "./_components/dashboard-view";
import { getActiveCompanyContext } from "@/lib/company-context";

export default async function Page() {
  const companyContext = await getActiveCompanyContext();
  const companyProfile = companyContext?.profile;

  if (!companyProfile) {
    redirect("/setup");
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["main-dashboard"],
    queryFn: () => getMainDashboardStats(),
  });

  return (
    <div className="container mx-auto px-4">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardView />
      </HydrationBoundary>
    </div>
  );
}
