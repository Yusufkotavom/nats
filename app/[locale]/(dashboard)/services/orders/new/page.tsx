import { getOpenPOSSession, getPOSContacts, getPOSServiceProducts } from "../../../../pos/actions";
import { SuperJSON } from "@/lib/superjson";
import { redirect } from "next/navigation";
import { ServiceOrderForm } from "../_components/service-order-form";

export const dynamic = "force-dynamic";

export default async function ServiceOrdersNewPage() {
  const [sessionRaw, productsRaw, contactsRaw] = await Promise.all([
    getOpenPOSSession(),
    getPOSServiceProducts(),
    getPOSContacts(),
  ]);

  if (!sessionRaw) {
    redirect("/services/orders");
  }

  const session = SuperJSON.deserialize<{ id: string }>(sessionRaw);
  const products = SuperJSON.deserialize<Array<{ id: string; name: string; price: number }>>(productsRaw);
  const contacts = SuperJSON.deserialize<Array<{ id: string; name: string }>>(contactsRaw);

  return (
    <ServiceOrderForm
      sessionId={session.id}
      products={products}
      contacts={contacts}
    />
  );
}
