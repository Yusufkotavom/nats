import { getProducts, getCategories } from "./actions";
import { ProductTable } from "./_components/product-table";
import { ProductDialog } from "./_components/product-dialog";

export default async function Page() {
  const products = await getProducts();
  const categories = await getCategories();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>
        <ProductDialog categories={categories} />
      </div>
      <ProductTable
        products={products.map((p) => ({
          ...p,
          price: Number(p.price),
          cost: Number(p.cost),
        }))}
        categories={categories}
      />
    </div>
  );
}
