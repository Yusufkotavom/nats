import { getOpenPOSSession, getKitchenTickets } from "../../actions";
import { SuperJSON } from "@/lib/superjson";
import { KitchenBoard } from "../_components/kitchen-board";
import Link from "next/link";

export default async function RestaurantKitchenPage() {
  const session = await getOpenPOSSession();

  if (!session) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Kitchen Board</h1>
        <p className="text-sm text-muted-foreground">Buka POS session terlebih dahulu.</p>
        <Link href="/pos" className="text-sm text-primary underline">
          Ke halaman POS
        </Link>
      </div>
    );
  }

  const deserializedSession = SuperJSON.deserialize<any>(session);
  const tickets = await getKitchenTickets(deserializedSession.id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Restaurant Service - Kitchen</h1>
          <p className="text-sm text-muted-foreground">Session: {deserializedSession.sessionNumber}</p>
        </div>
        <Link href="/pos/restaurant" className="text-sm text-primary underline">
          Floor & Tables
        </Link>
      </div>
      <KitchenBoard sessionId={deserializedSession.id} initialData={tickets} />
    </div>
  );
}
