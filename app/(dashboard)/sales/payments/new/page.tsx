import { Metadata } from "next";
import { SalesPaymentForm } from "../_components/sales-payment-form";

export const metadata: Metadata = {
  title: "New Sales Payment | Pasak",
  description: "Create a new sales payment",
};

export default function NewSalesPaymentPage() {
  return <SalesPaymentForm />;
}
