import { getPurchasePayment } from "../actions";
import { PurchasePaymentForm } from "../_components/purchase-payment-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { SuperJSON } from "@/lib/superjson";
import { PurchasePaymentWithDetails } from "../types";

export const metadata: Metadata = {
  title: "View Purchase Payment | Pasak",
  description: "View purchase payment details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewPurchasePaymentPage(props: PageProps) {
  const params = await props.params;
  const paymentData = await getPurchasePayment(params.id);

  if (!paymentData) {
    notFound();
  }

  const payment = SuperJSON.deserialize<PurchasePaymentWithDetails>(paymentData);

  return <PurchasePaymentForm initialData={payment} readonly />;
}
