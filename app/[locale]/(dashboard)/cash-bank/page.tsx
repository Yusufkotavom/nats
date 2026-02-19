export const dynamic = "force-dynamic";

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { getDashboardStats, getAvailableGLAccounts } from "./actions";
import { DashboardView } from "./_components/dashboard-view";

export default async function CashBankPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["cash-bank", "dashboard-stats"],
      queryFn: () => getDashboardStats(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["cash-bank", "gl-accounts"],
      queryFn: () => getAvailableGLAccounts(),
    }),
  ]);

  return (
    <div className="container mx-auto px-4">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardView />
      </HydrationBoundary>
    </div>
  );
}
