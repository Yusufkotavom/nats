export const dynamic = "force-dynamic";

import { getWarehouse, getWarehouseInventory, getCategories } from "./actions";
import { WarehouseDetailView } from "./_components/warehouse-detail-view";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { notFound } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ warehouseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { warehouseId } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;
  const categoryId =
    typeof resolvedSearchParams.categoryId === "string"
      ? resolvedSearchParams.categoryId
      : "ALL";

  const warehouse = await getWarehouse(warehouseId);

  if (!warehouse?.json) {
    notFound();
  }

  const queryClient = new QueryClient();

  // Set warehouse data directly since we already fetched it
  queryClient.setQueryData(["warehouse", warehouseId], warehouse);

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: getCategories,
    }),
    queryClient.prefetchQuery({
      queryKey: ["warehouse-inventory", warehouseId, page, search, categoryId],
      queryFn: () =>
        getWarehouseInventory(
          warehouseId,
          page,
          10,
          search,
          categoryId === "ALL" ? undefined : categoryId,
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WarehouseDetailView warehouseId={warehouseId} />
    </HydrationBoundary>
  );
}
