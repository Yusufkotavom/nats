import { SalesShipmentForm } from "../_components/sales-shipment-form";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect, getSalesShipment } from "../actions";
import { notFound } from "next/navigation";
import { SuperJSONResult } from "superjson";

interface ViewSalesShipmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesShipmentPage({
  params,
}: ViewSalesShipmentPageProps) {
  const { id } = await params;
  const [contactsResult, salesOrdersResult, shipmentResult] = await Promise.all([
    getContacts({ page: 1, pageSize: 1000 }),
    getSalesOrdersForSelect(),
    getSalesShipment(id),
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
      salesOrders={salesOrdersResult as SuperJSONResult}
      readonly
    />
  );
}
