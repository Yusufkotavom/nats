import { getVendors, getProducts } from "../actions";
import { PurchaseOrderForm } from "../_components/purchase-order-form";

export default async function Page() {
  const [vendors, products] = await Promise.all([getVendors(), getProducts()]);

  return (
    <div className="flex-1 space-y-4 px-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          Create Purchase Order
        </h2>
      </div>
      <PurchaseOrderForm
        vendors={vendors}
        products={products.map((p) => ({
          ...p,
          cost: Number(p.cost),
        }))}
      />
    </div>
  );
}
