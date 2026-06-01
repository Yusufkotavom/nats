export const dynamic = "force-dynamic";

import { SalesShipmentForm } from "../../_components/sales-shipment-form";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect, getSalesShipment } from "../../actions";
import { notFound } from "next/navigation";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { SuperJSONResult } from "superjson";
import { getSalesPipelineBridgeByContext } from "../../../_lib/pipeline-bridge";
import { SalesPipelineTopbar } from "../../../_components/sales-pipeline-topbar";

interface EditSalesShipmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalesShipmentPage({
  params,
}: EditSalesShipmentPageProps) {
  const { id } = await params;
  const [contactsResult, salesOrdersResult, shipmentResult, departments, projects, pipeline] = await Promise.all([
    getContacts({ page: 1, pageSize: 1000 }),
    getSalesOrdersForSelect(),
    getSalesShipment(id),
    getDepartments(),
    getProjects(),
    getSalesPipelineBridgeByContext({ kind: "shipment", id }),
  ]);

  if (!shipmentResult) {
    notFound();
  }

  return (
    <>
      <SalesPipelineTopbar data={pipeline} active="shipment" />
      <SalesShipmentForm
        shipment={shipmentResult}
        customers={contactsResult.data.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
        }))}
        salesOrders={salesOrdersResult as unknown as SuperJSONResult}
        departments={departments}
        projects={projects.projects}
      />
    </>
  );
}
