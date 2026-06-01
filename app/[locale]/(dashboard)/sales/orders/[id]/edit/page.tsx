export const dynamic = "force-dynamic";

import { getSalesOrder, getServiceMetaBySalesOrderId } from "../../actions";
import { SalesOrderForm } from "../../_components/sales-order-form";
import { notFound } from "next/navigation";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { SuperJSONResult } from "superjson";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getSalesPipelineBridgeByContext } from "../../../_lib/pipeline-bridge";
import { SalesPipelineTopbar } from "../../../_components/sales-pipeline-topbar";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [orderResult, customers, products, departments, projects, pipeline] = await Promise.all([
    getSalesOrder(id),
    getContacts({ type: ContactType.CUSTOMER }),
    getProducts(),
    getDepartments(),
    getProjects(),
    getSalesPipelineBridgeByContext({ kind: "order", id }),
  ]);

  if (!orderResult) {
    notFound();
  }

  const serviceMeta = await getServiceMetaBySalesOrderId(id);

  return (
    <>
      <SalesPipelineTopbar data={pipeline} active="order" />
      <SalesOrderForm
        order={orderResult as unknown as SuperJSONResult}
        customers={customers.data}
        products={products.products}
        departments={departments}
        projects={projects.projects}
        serviceMeta={serviceMeta as unknown as SuperJSONResult}
      />
    </>
  );
}
