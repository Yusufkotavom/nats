import { getCategories, getProduct } from "../actions";
import { getUnits } from "../../uom/actions";
import { getAccounts } from "@/app/(dashboard)/accounting/accounts/actions";
import { ProductForm } from "../_components/product-form";
import { notFound } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { ProductFormData } from "../../types";
import { Protect } from "@/components/ui/protect";

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
    <Protect
      permission="products.view"
      fallback={<div>You do not have permission to view products.</div>}
    >
      <ProductForm
        product={product}
        categories={categories}
        units={units.data}
        accounts={accounts as any}
        readonly={true}
      /></Protect>
  );
}
