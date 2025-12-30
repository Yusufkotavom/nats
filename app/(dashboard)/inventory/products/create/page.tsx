import { getCategories } from "../actions";
import { getUnits } from "../../uom/actions";
import { ProductForm } from "../_components/product-form";
import { Protect } from "@/components/ui/protect";

export default async function CreateProductPage() {
  const [categories, units] = await Promise.all([getCategories(), getUnits()]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Protect
        permission="products.create"
        fallback={<div>You do not have permission to create products.</div>}
      >
        <ProductForm categories={categories} units={units.data} />
      </Protect>
    </div>
  );
}
