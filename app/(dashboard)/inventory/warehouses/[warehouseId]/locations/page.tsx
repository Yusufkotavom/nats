export const dynamic = "force-dynamic";

import { getLocations, getWarehouse } from "./actions";
import { LocationsView } from "./_components/locations-view";
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

  const warehouse = await getWarehouse(warehouseId);

  if (!warehouse.json) {
    notFound();
  }

  const queryClient = new QueryClient();

  queryClient.setQueryData(["warehouse", warehouseId], warehouse);

  await queryClient.prefetchQuery({
    queryKey: ["locations", warehouseId, page],
    queryFn: () => getLocations(warehouseId, page),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LocationsView warehouseId={warehouseId} />
    </HydrationBoundary>
  );
}
