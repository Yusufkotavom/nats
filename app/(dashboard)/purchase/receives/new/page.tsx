export const dynamic = "force-dynamic";

import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import { getProducts, getPurchaseOrdersForSelect } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";

export default async function Page() {
  const [vendors, products, purchaseOrders, departments, projects] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getPurchaseOrdersForSelect(),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <PurchaseReceiveForm
      vendors={vendors.data}
      products={products}
      purchaseOrders={purchaseOrders}
      departments={departments}
      projects={projects}
    />
  );
}
