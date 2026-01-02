import { getCategories } from "../actions";
import { getUnits } from "../../uom/actions";
import { getAccounts } from "@/app/(dashboard)/accounting/accounts/actions";
import { ProductForm } from "../_components/product-form";
import { Protect } from "@/components/ui/protect";

export default async function CreateProductPage() {
  const [categories, units, accounts] = await Promise.all([
    getCategories(),
    getUnits(),
    getAccounts(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Protect
        permission="products.create"
        fallback={<div>You do not have permission to create products.</div>}
      >
        <ProductForm
          categories={categories}
          units={units.data}
          accounts={accounts as any}
        />
      </Protect>
    </div>
  );
}
