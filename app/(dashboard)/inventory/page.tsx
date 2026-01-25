import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { getInventoryDashboardMetrics } from "./actions";
import { InventoryDashboardView } from "./_components/inventory-dashboard-view";

export default async function InventoryDashboardPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["inventory-dashboard-metrics"],
    queryFn: () => getInventoryDashboardMetrics(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryDashboardView />
    </HydrationBoundary>
  );
}
