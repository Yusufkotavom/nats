import { createServiceOrder, createServiceQuickContact, getServiceCreateMeta, getServicePaymentMethods } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { ServiceOrderForm } from "../_components/service-order-form";

export const dynamic = "force-dynamic";

export default async function ServiceOrdersNewPage() {
  const raw = await getServiceCreateMeta();
  const paymentMethodsRaw = await getServicePaymentMethods();
  const meta = SuperJSON.deserialize<{
    session: { id: string };
    products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
    contacts: Array<{ id: string; name: string }>;
  }>(raw);
  const paymentMethods = SuperJSON.deserialize<Array<{
    id: string;
    name: string;
    method: "CASH" | "BANK";
    accountType: "CASH" | "PETTY_CASH" | "BANK" | "EWALLET";
    bankName: string | null;
    accountNumber: string | null;
  }>>(paymentMethodsRaw);

  return (
    <ServiceOrderForm
      products={meta.products}
      contacts={meta.contacts}
      paymentMethodOptions={paymentMethods}
      createOrderAction={createServiceOrder}
      createQuickContactAction={createServiceQuickContact}
    />
  );
}
