import { getPurchaseOrder, getVendors, getProducts } from "../actions";
import { PurchaseOrderForm } from "../_components/purchase-order-form";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, vendors, products] = await Promise.all([
    getPurchaseOrder(id),
    getVendors(),
    getProducts(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <PurchaseOrderForm
      order={order}
      vendors={vendors}
      products={products.map((p) => ({
        ...p,
        cost: Number(p.cost),
      }))}
      readonly
    />
  );
}
