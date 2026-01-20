import { getCategories, getPricingProducts } from "./actions";
import { BatchPricingForm } from "./_components/batch-pricing-form";
import { IndividualPricingTable } from "./_components/individual-pricing-table";
import { Protect } from "@/components/ui/protect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuperJSON } from "@/lib/superjson";
import { Category } from "@/prisma/generated/prisma/browser";
import { PricingProductWithDetails } from "./types";

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

  const [categoriesData, productsData] = await Promise.all([
    getCategories(),
    getPricingProducts(page, 10, search, categoryId),
  ]);

  const { products: serializedProducts, totalPages, total } = productsData;
  const categories = categoriesData;
  const products =
    SuperJSON.deserialize<PricingProductWithDetails[]>(serializedProducts);

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Pricing Configuration
        </h2>
      </div>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual Pricing</TabsTrigger>
          <TabsTrigger value="batch">Batch Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="batch" className="space-y-4">
          <Protect
            permission="products.edit"
            fallback={<div>You do not have permission to manage pricing.</div>}
          >
            <BatchPricingForm categories={categories} />
          </Protect>
        </TabsContent>
        <TabsContent value="individual" className="space-y-4">
          <Protect
            permission="products.edit"
            fallback={<div>You do not have permission to manage pricing.</div>}
          >
            <IndividualPricingTable
              initialProducts={products}
              categories={categories}
              totalPages={totalPages}
              totalEntries={total}
            />
          </Protect>
        </TabsContent>
      </Tabs>
    </div>
  );
}
