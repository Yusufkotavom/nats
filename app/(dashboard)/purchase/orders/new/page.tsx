export const dynamic = "force-dynamic";

import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseOrderForm } from "../_components/purchase-order-form";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";

export default async function Page() {
  const [vendors, products, departments, projects] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <PurchaseOrderForm
      vendors={vendors.data}
      products={products.products}
      departments={departments}
      projects={projects}
    />
  );
}
