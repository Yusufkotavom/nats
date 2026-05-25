export const dynamic = "force-dynamic";

import { getSalesPayment } from "../actions";
import { SalesPaymentForm } from "../_components/sales-payment-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { SuperJSON } from "@/lib/superjson";
import { SalesPaymentWithDetails } from "../types";
import { getSalesPipelineBridgeByContext } from "../../_lib/pipeline-bridge";
import { SalesPipelineTopbar } from "../../_components/sales-pipeline-topbar";

export const metadata: Metadata = {
  title: "View Sales Payment | NATS",
  description: "View sales payment details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewSalesPaymentPage(props: PageProps) {
  const params = await props.params;
  const [paymentData, pipeline] = await Promise.all([
    getSalesPayment(params.id),
    getSalesPipelineBridgeByContext({ kind: "payment", id: params.id }),
  ]);

  if (!paymentData) {
    notFound();
  }

  const payment = SuperJSON.deserialize<SalesPaymentWithDetails>(paymentData);

  return (
    <>
      <SalesPipelineTopbar data={pipeline} active="payment" />
      <SalesPaymentForm initialData={payment} readonly />
    </>
  );
}
