import { notFound } from "next/navigation";
import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import {
  getPurchaseReceive,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const [receive, vendors, products, purchaseOrders] = await Promise.all([
    getPurchaseReceive(id),
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getPurchaseOrdersForSelect(),
  ]);

  if (!receive) {
    notFound();
  }

  return (
    <PurchaseReceiveForm
      receive={receive}
      vendors={vendors.data}
      products={products.map((p) => ({
        ...p,
        cost: 0,
      }))}
      purchaseOrders={purchaseOrders}
      readonly
    />
  );
}
