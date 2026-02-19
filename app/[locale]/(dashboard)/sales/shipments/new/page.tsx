export const dynamic = "force-dynamic";

import { SalesShipmentForm } from "../_components/sales-shipment-form";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect } from "../actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { SuperJSONResult } from "superjson";

export default async function NewSalesShipmentPage() {
  const [contactsResult, salesOrdersResult, departments, projects] = await Promise.all([
    getContacts({ page: 1, pageSize: 1000 }), // Fetch all contacts for dropdown
    getSalesOrdersForSelect(),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <SalesShipmentForm
      customers={contactsResult.data.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
      salesOrders={salesOrdersResult as unknown as SuperJSONResult}
      departments={departments}
      projects={projects}
    />
  );
}
