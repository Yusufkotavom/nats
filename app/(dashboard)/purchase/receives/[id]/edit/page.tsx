export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PurchaseReceiveForm } from "../../_components/purchase-receive-form";
import {
  getPurchaseReceive,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";
import { SuperJSONResult } from "superjson";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const [receive, vendors, products, purchaseOrders, departments, projects] = await Promise.all([
    getPurchaseReceive(id),
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getPurchaseOrdersForSelect(),
    getDepartments(),
    getProjects(),
  ]);

  if (!receive) {
    notFound();
  }

  return (
    <PurchaseReceiveForm
      receive={receive}
      vendors={vendors.data}
      products={products as unknown as SuperJSONResult}
      purchaseOrders={purchaseOrders as unknown as SuperJSONResult}
      departments={departments}
      projects={projects}
    />
  );
}
