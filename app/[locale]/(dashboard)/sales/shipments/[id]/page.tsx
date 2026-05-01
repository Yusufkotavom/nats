export const dynamic = "force-dynamic";

import { SalesShipmentForm } from "../_components/sales-shipment-form";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect, getSalesShipment } from "../actions";
import { notFound } from "next/navigation";
import { SuperJSONResult } from "superjson";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";

interface ViewSalesShipmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesShipmentPage({
  params,
}: ViewSalesShipmentPageProps) {
  const { id } = await params;
  const [contactsResult, salesOrdersResult, shipmentResult, departments, projects] = await Promise.all([
    getContacts({ page: 1, pageSize: 1000 }),
    getSalesOrdersForSelect(),
    getSalesShipment(id),
    getDepartments(),
    getProjects(),
  ]);

  if (!shipmentResult) {
    notFound();
  }

  return (
    <SalesShipmentForm
      shipment={shipmentResult}
      customers={contactsResult.data.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
      salesOrders={salesOrdersResult as unknown as SuperJSONResult}
      departments={departments}
      projects={projects.projects}
      readonly
    />
  );
}
