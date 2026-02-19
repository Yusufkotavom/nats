export const dynamic = "force-dynamic";

import { getCategories } from "../actions";
import { getUnits } from "../../uom/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";
import { ProductForm } from "../_components/product-form";
import { Protect } from "@/components/ui/protect";

export default async function CreateProductPage() {
  const [categories, units, taxRates] = await Promise.all([
    getCategories(),
    getUnits(),
    getTaxRates(),
  ]);

  return (
    <Protect
      permission="products.create"
      fallback={<div>You do not have permission to create products.</div>}
    >
      <ProductForm
        categories={categories}
        units={units.data}
        taxRates={taxRates}
      />
    </Protect>
  );
}
