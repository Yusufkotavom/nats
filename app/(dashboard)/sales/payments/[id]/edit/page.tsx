import { getSalesPayment } from "../../actions";
import { SalesPaymentForm } from "../../_components/sales-payment-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { SuperJSON } from "@/lib/superjson";
import { SalesPaymentWithDetails } from "../../types";

export const metadata: Metadata = {
  title: "Edit Sales Payment | Pasak",
  description: "Edit sales payment details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSalesPaymentPage(props: PageProps) {
  const params = await props.params;
  const paymentData = await getSalesPayment(params.id);

  if (!paymentData) {
    notFound();
  }

  const payment = SuperJSON.deserialize<SalesPaymentWithDetails>(paymentData);

  if (payment.journalEntryId) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Cannot edit posted payments.
          </p>
        </div>
      </div>
    );
  }

  return <SalesPaymentForm initialData={payment} />;
}
