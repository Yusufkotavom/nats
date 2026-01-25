import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getWarehouses } from "./actions";
import { WarehousesView } from "./_components/warehouses-view";

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const queryClient = new QueryClient();
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const pageSize = 10;

  await queryClient.prefetchQuery({
    queryKey: ["warehouses", { page }],
    queryFn: () => getWarehouses(page, pageSize),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WarehousesView />
    </HydrationBoundary>
  );
}
