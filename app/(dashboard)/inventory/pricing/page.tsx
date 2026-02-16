import { QueryClient } from "@tanstack/react-query";
import { getCategories, getPricingProducts, getGlobalDiscounts } from "./actions";
import { BatchPricingForm } from "./_components/batch-pricing-form";
import { IndividualPricingTable } from "./_components/individual-pricing-table";
import { GlobalDiscountManager } from "./_components/global-discount-manager";
import { Protect } from "@/components/ui/protect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuperJSON } from "@/lib/superjson";
import { PricingProductWithDetails } from "./types";
export const dynamic = "force-dynamic";

import {
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const categoryId = params.categoryId || "ALL";

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: getCategories,
    }),
    queryClient.prefetchQuery({
      queryKey: ["pricing-products", { page, search, categoryId }],
      queryFn: async () => {
        const res = await getPricingProducts(page, 10, search, categoryId);
        return {
          ...res,
          products: SuperJSON.deserialize<PricingProductWithDetails[]>(
            res.products,
          ),
        };
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["global-discounts"],
      queryFn: async () => {
        const res = await getGlobalDiscounts();
        return SuperJSON.deserialize<any[]>(res);
      },
    }),
  ]);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Pricing Configuration" />
      </PageListHeader>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual Pricing</TabsTrigger>
          <TabsTrigger value="batch">Batch Pricing</TabsTrigger>
          <TabsTrigger value="global">Global Discounts</TabsTrigger>
        </TabsList>
        <TabsContent value="batch" className="space-y-4">
          <Protect
            permission="products.edit"
            fallback={<div>You do not have permission to manage pricing.</div>}
          >
            <BatchPricingForm />
          </Protect>
        </TabsContent>
        <TabsContent value="individual" className="space-y-4">
          <Protect
            permission="products.edit"
            fallback={<div>You do not have permission to manage pricing.</div>}
          >
            <IndividualPricingTable />
          </Protect>
        </TabsContent>
        <TabsContent value="global" className="space-y-4">
          <Protect
            permission="products.edit"
            fallback={<div>You do not have permission to manage pricing.</div>}
          >
            <GlobalDiscountManager />
          </Protect>
        </TabsContent>
      </Tabs>
    </PageListLayout>
  );
}
