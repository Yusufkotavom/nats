import { PaymentMethodView } from "./_components/payment-method-view";

export default function PaymentMethodPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <p className="text-sm text-muted-foreground">
          Single source of truth payment mapping. Hanya method CASH dan BANK.
        </p>
      </div>
      <PaymentMethodView />
    </div>
  );
}
