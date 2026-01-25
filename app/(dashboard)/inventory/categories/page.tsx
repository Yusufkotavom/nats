import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getCategories } from "./actions";
import { CategoriesView } from "./_components/categories-view";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search = (resolvedSearchParams.search as string) || "";
  const pageSize = 10;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["categories", { page, search }],
    queryFn: () => getCategories(page, pageSize, search || undefined),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoriesView />
    </HydrationBoundary>
  );
}
