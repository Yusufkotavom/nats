import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getUnits } from "./actions";
import { UomView } from "./_components/uom-view";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const pageSize = 10;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["uom", { page }],
    queryFn: () => getUnits(page, pageSize),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UomView />
    </HydrationBoundary>
  );
}
