export const dynamic = "force-dynamic";

import { getPurchaseOrder } from "../../actions";
import { PurchaseOrderForm } from "../../_components/purchase-order-form";
import { notFound } from "next/navigation";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, vendors, products] = await Promise.all([
    getPurchaseOrder(id),
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <PurchaseOrderForm
      order={order}
      vendors={vendors.data}
      products={products.products}
    />
  );
}
