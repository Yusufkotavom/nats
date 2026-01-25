import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getCategories, getProducts } from "./actions";
import { ProductsView } from "./_components/products-view";
import { SuperJSON } from "@/lib/superjson";
import { ProductFormData } from "../types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search = (resolvedSearchParams.search as string) || "";
  const categoryId = (resolvedSearchParams.categoryId as string) || "ALL";
  const pageSize = 10;

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["products", { page, search, categoryId }],
      queryFn: async () => {
        const serialized = await getProducts(
          page,
          pageSize,
          search || undefined,
          categoryId
        );
        return SuperJSON.deserialize(serialized) as {
          products: ProductFormData[];
          total: number;
          totalPages: number;
        };
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: getCategories,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsView />
    </HydrationBoundary>
  );
}
