import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { DashboardView } from "./_components/dashboard-view";
import {
  getDashboardSummary,
  getPurchaseTrends,
  getRecentPurchases,
} from "./actions";
import { prisma } from "@/lib/prisma";

export default async function PurchaseDashboardPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["purchase-dashboard-summary"],
      queryFn: async () => {
        const res = await getDashboardSummary();
        return res.success
          ? res.data
          : {
              totalOrders: 0,
              totalPurchases: 0,
              totalPaid: 0,
              outstandingAmount: 0,
            };
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["purchase-trends"],
      queryFn: async () => {
        const res = await getPurchaseTrends();
        return res.success ? res.data : [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["recent-purchases"],
      queryFn: async () => {
        const res = await getRecentPurchases();
        return res.success ? res.data : [];
      },
    }),
  ]);

  const companyProfile = await prisma.companyProfile.findFirst();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView companyProfile={companyProfile} />
    </HydrationBoundary>
  );
}
