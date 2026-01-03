import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseOrderForm } from "../_components/purchase-order-form";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";

export default async function Page() {
  const [vendors, products] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
  ]);

  return (
    <PurchaseOrderForm vendors={vendors.data} products={products.products} />
  );
}
