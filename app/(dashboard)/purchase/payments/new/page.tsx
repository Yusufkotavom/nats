import { Metadata } from "next";
import { PurchasePaymentForm } from "../_components/purchase-payment-form";

export const metadata: Metadata = {
  title: "New Purchase Payment | Pasak",
  description: "Create a new purchase payment",
};

export default function NewPurchasePaymentPage() {
  return <PurchasePaymentForm />;
}
