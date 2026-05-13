import { Metadata } from "next";
import { SuperJSON } from "@/lib/superjson";
import { getQuickPurchaseFormData } from "./actions";
import { QuickPurchaseForm } from "./_components/quick-purchase-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Purchase | NATS",
  description: "Fast purchase flow for cash daily and monthly credit",
};

export default async function QuickPurchasePage() {
  const serialized = await getQuickPurchaseFormData();
  const data = SuperJSON.deserialize<{
    vendors: { id: string; name: string }[];
    products: { id: string; name: string; sku: string; cost: number }[];
    cashAccounts: { id: string; name: string }[];
    departments: { id: string; name: string }[];
    projects: { id: string; name: string }[];
  }>(serialized);

  return <QuickPurchaseForm data={data} />;
}
