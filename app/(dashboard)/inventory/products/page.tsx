import { getProducts, getCategories } from "./actions";
import { getUnits } from "../uom/actions";
import { ProductTable } from "./_components/product-table";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function Page({
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

  const [productsData, categories, units] = await Promise.all([
    getProducts(page, 10, search, categoryId),
    getCategories(),
    getUnits(),
  ]);

  const { products, totalPages, total } = productsData;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <Protect permission="products.create">
          <Button asChild>
            <Link href="/inventory/products/create">
              <Plus className="mr-2 h-4 w-4" /> Create Product
            </Link>
          </Button>
        </Protect>
      </div>
      <ProductTable
        products={products.map((p) => ({
          ...p,
          price: Number(p.price),
          cost: Number(p.cost),
          purchaseConversionFactor: Number(p.purchaseConversionFactor),
          salesConversionFactor: Number(p.salesConversionFactor),
        }))}
        categories={categories}
        units={units.data}
        totalPages={totalPages}
        totalEntries={total}
      />
    </div>
  );
}
