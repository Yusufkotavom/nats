import { notFound } from "next/navigation";
import { PurchaseReceiveForm } from "../../_components/purchase-receive-form";
import {
  getPurchaseReceive,
  getVendors,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../../actions";

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
    <PurchaseReceiveForm
      receive={receive}
      vendors={vendors}
      products={products.map((p) => ({
        ...p,
        cost: 0,
      }))}
      purchaseOrders={purchaseOrders.map((po) => ({
        id: po.id,
        orderNumber: po.orderNumber,
        contactId: po.contactId,
        contact: po.contact,
      }))}
    />
  );
}
