import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesOrderForm } from "../_components/sales-order-form";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";

export default async function Page() {
  const [customers, products] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getProducts(),
  ]);

  return (
    <SalesOrderForm customers={customers.data} products={products.products} />
  );
}
