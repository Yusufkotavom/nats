import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import {
  getVendors,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../actions";

export default async function Page() {
  const [vendors, products, purchaseOrders] = await Promise.all([
    getVendors(),
    getProducts(),
    getPurchaseOrdersForSelect(),
  ]);

  return (
    <PurchaseReceiveForm
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
        items: po.items, // Need items for filtering
      }))}
    />
  );
}
