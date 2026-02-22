export const dynamic = "force-dynamic";

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { getDashboardStats } from "./actions";
import { DashboardView } from "./_components/dashboard-view";

export default async function CashBankPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["cash-bank", "dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  return (
    <div className="container mx-auto px-4">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardView />
      </HydrationBoundary>
    </div>
  );
}
