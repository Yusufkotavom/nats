import { SalesShipmentForm } from "../../_components/sales-shipment-form";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { getSalesOrdersForSelect, getSalesShipment } from "../../actions";
import { notFound } from "next/navigation";

interface EditSalesShipmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalesShipmentPage({
  params,
}: EditSalesShipmentPageProps) {
  const { id } = await params;
  const [contactsResult, salesOrdersResult, shipmentResult] = await Promise.all([
    getContacts(1, 1000),
    getSalesOrdersForSelect(),
    getSalesShipment(id),
  ]);

  if (!shipmentResult) {
    notFound();
  }

  return (
    <SalesShipmentForm
      shipment={shipmentResult}
      customers={contactsResult.contacts.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
      salesOrders={salesOrdersResult}
    />
  );
}
