import { createServiceOrder, createServiceQuickContact, getServiceCreateMeta } from "../../actions";
import { SuperJSON } from "@/lib/superjson";
import { ServiceOrderForm } from "../_components/service-order-form";

export const dynamic = "force-dynamic";

export default async function ServiceOrdersNewPage() {
  const raw = await getServiceCreateMeta();
  const meta = SuperJSON.deserialize<{
    session: { id: string };
    products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
    contacts: Array<{ id: string; name: string }>;
  }>(raw);

  return (
    <ServiceOrderForm
      products={meta.products}
      contacts={meta.contacts}
      createOrderAction={createServiceOrder}
      createQuickContactAction={createServiceQuickContact}
    />
  );
}
