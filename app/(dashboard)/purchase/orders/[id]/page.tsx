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
    <div className="flex-1 space-y-4 p-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Purchase Order {order.orderNumber}</h2>
      </div>
      <PurchaseOrderForm
        order={order}
        vendors={vendors}
        products={products.map(p => ({
          ...p,
          cost: Number(p.cost)
        }))}
        readonly
      />
    </div>
  );
}
