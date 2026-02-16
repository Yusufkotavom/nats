export const dynamic = "force-dynamic";

import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesOrderForm } from "../_components/sales-order-form";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";

export default async function Page() {
  const [customers, products, departments, projects] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getProducts(),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <SalesOrderForm
      customers={customers.data}
      products={products.products}
      departments={departments}
      projects={projects}
    />
  );
}
