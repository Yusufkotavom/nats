import { SalesShipmentForm } from "../_components/sales-shipment-form";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect } from "../actions";

export default async function NewSalesShipmentPage() {
  const [contactsResult, salesOrdersResult] = await Promise.all([
    getContacts(1, 1000), // Fetch all contacts for dropdown
    getSalesOrdersForSelect(),
  ]);

  return (
    <SalesShipmentForm
      customers={contactsResult.contacts.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
      salesOrders={salesOrdersResult}
    />
  );
}
