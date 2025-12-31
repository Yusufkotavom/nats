import { getVendors, getProducts } from "../actions";
import { PurchaseOrderForm } from "../_components/purchase-order-form";

export default async function Page() {
  const [vendors, products] = await Promise.all([getVendors(), getProducts()]);

  return (
    <PurchaseOrderForm
      vendors={vendors}
      products={products.map((p) => ({
        ...p,
        cost: Number(p.cost),
      }))}
    />
  );
}
