import { getPurchaseOrder } from "../actions";
import { PurchaseOrderForm } from "../_components/purchase-order-form";
import { notFound } from "next/navigation";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";
import { SuperJSONResult } from "superjson";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [orderResult, vendors, products] = await Promise.all([
    getPurchaseOrder(id),
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
  ]);

  if (!orderResult) {
    notFound();
  }

  return (
    <PurchaseOrderForm
      order={orderResult as unknown as SuperJSONResult}
      vendors={vendors.data}
      products={products.products}
      readonly
    />
  );
}
