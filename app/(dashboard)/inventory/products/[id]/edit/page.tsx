import { getCategories, getProduct } from "../../actions";
import { getUnits } from "../../../uom/actions";
import { ProductForm } from "../../_components/product-form";
import { Protect } from "@/components/ui/protect";
import { notFound } from "next/navigation";
import { ProductFormData } from "../../../types";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, units] = await Promise.all([
    getProduct(id),
    getCategories(),
    getUnits(),
  ]);

  if (!product) {
    notFound();
  }

  // Convert Decimal to number for the form
  const productFormData: ProductFormData = {
    ...product,
    price: Number(product.price),
    cost: Number(product.cost),
    purchaseConversionFactor: Number(product.purchaseConversionFactor),
    salesConversionFactor: Number(product.salesConversionFactor),
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Protect
        permission="products.edit"
        fallback={<div>You do not have permission to edit products.</div>}
      >
        <ProductForm
          product={productFormData}
          categories={categories}
          units={units}
        />
      </Protect>
    </div>
  );
}
