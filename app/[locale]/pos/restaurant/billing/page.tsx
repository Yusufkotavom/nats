import { getOpenPOSSession, getRestaurantBillingQueue, getPOSCheckoutSettings } from "../../actions";
import { SuperJSON } from "@/lib/superjson";
import { BillingBoard } from "../_components/billing-board";
import Link from "next/link";

export default async function RestaurantBillingPage() {
  const session = await getOpenPOSSession();

  if (!session) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">Buka POS session terlebih dahulu.</p>
        <Link href="/pos" className="text-sm text-primary underline">
          Ke halaman POS
        </Link>
      </div>
    );
  }

  const deserializedSession = SuperJSON.deserialize<any>(session);
  const queue = await getRestaurantBillingQueue(deserializedSession.id);
  const checkoutSettings = await getPOSCheckoutSettings();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Restaurant Service - Billing</h1>
          <p className="text-sm text-muted-foreground">Session: {deserializedSession.sessionNumber}</p>
        </div>
        <Link href="/pos/restaurant" className="text-sm text-primary underline">
          Floor & Tables
        </Link>
      </div>
      <BillingBoard
        sessionId={deserializedSession.id}
        initialData={queue}
        checkoutSettings={checkoutSettings}
      />
    </div>
  );
}
