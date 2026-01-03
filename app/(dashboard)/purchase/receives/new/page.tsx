import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import { getProducts, getPurchaseOrdersForSelect } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

export default async function Page() {
  const [vendors, products, purchaseOrders] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getPurchaseOrdersForSelect(),
  ]);

  return (
    <PurchaseReceiveForm
      vendors={vendors.data}
      products={products.map((p) => ({
        ...p,
        cost: 0,
      }))}
      purchaseOrders={purchaseOrders}
    />
  );
}
