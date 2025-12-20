import { getProducts, getCategories } from "./actions";
import { ProductTable } from "./_components/product-table";
import { ProductDialog } from "./_components/product-dialog";
import { Protect } from "@/components/protect";

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

  const { products, totalPages } = await getProducts(
    page,
    10,
    search,
    categoryId
  );
  const categories = await getCategories();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <Protect permission="products.create">
          <ProductDialog categories={categories} />
        </Protect>
      </div>
      <ProductTable
        products={products.map((p) => ({
          ...p,
          price: Number(p.price),
          cost: Number(p.cost),
        }))}
        categories={categories}
        totalPages={totalPages}
      />
    </div>
  );
}
