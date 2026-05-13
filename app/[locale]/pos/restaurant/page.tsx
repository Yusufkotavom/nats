import { getOpenPOSSession, getRestaurantFloorOverview } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { FloorBoard } from "./_components/floor-board";
import Link from "next/link";

export default async function RestaurantFloorPage() {
  const session = await getOpenPOSSession();

  if (!session) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Restaurant Service</h1>
        <p className="text-sm text-muted-foreground">Buka POS session terlebih dahulu.</p>
        <Link href="/pos" className="text-sm text-primary underline">
          Ke halaman POS
        </Link>
      </div>
    );
  }

  const deserializedSession = SuperJSON.deserialize<any>(session);
  const floorData = await getRestaurantFloorOverview(deserializedSession.id);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Restaurant Service - Floor & Tables</h1>
        <p className="text-sm text-muted-foreground">Session: {deserializedSession.sessionNumber}</p>
      </div>
      <FloorBoard sessionId={deserializedSession.id} initialData={floorData} />
    </div>
  );
}
