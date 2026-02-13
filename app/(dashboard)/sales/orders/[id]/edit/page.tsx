import { getSalesOrder } from "../../actions";
import { SalesOrderForm } from "../../_components/sales-order-form";
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
  const [orderResult, customers, products] = await Promise.all([
    getSalesOrder(id),
    getContacts({ type: ContactType.CUSTOMER }),
    getProducts(),
  ]);

  if (!orderResult) {
    notFound();
  }

  return (
    <SalesOrderForm
      order={orderResult as unknown as SuperJSONResult}
      customers={customers.data}
      products={products.products}
    />
  );
}
