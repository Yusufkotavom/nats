import { notFound } from "next/navigation";
import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import {
  getPurchaseReceive,
  getVendors,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../actions";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const [receive, vendors, products, purchaseOrders] = await Promise.all([
    getPurchaseReceive(id),
    getVendors(),
    getProducts(),
    getPurchaseOrdersForSelect(),
  ]);

  if (!receive) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Receive Details {receive.receiveNumber}
        </h2>
      </div>
      <PurchaseReceiveForm
        receive={receive}
        vendors={vendors}
        products={products.map((p) => ({
          ...p,
          cost: 0,
        }))}
        purchaseOrders={purchaseOrders.map((po: any) => ({
          id: po.id,
          orderNumber: po.orderNumber,
          vendorId: po.vendorId,
          vendor: po.vendor,
        }))}
        readonly
      />
    </div>
  );
}
