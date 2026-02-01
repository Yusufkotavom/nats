import { getCategories, getProduct } from "../actions";
import { getUnits } from "../../uom/actions";
import { getAccounts } from "@/app/(dashboard)/accounting/accounts/actions";
import { ProductForm } from "../_components/product-form";
import { notFound } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { ProductFormData } from "../../types";

export default async function ProductViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [productData, categories, units, accounts] = await Promise.all([
    getProduct(id),
    getCategories(),
    getUnits(),
    getAccounts(),
  ]);

  if (!productData) {
    notFound();
  }

  const product = SuperJSON.deserialize(productData) as ProductFormData;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ProductForm
        product={product}
        categories={categories}
        units={units.data}
        accounts={accounts as any}
        readonly={true}
      />
    </div>
  );
}
