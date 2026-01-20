import { getMovementBatches } from "./actions";
import { BatchTable, BatchWithDetails } from "./_components/batch-table";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SuperJSON } from "@/lib/superjson";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { batches: serializedBatches, total } = await getMovementBatches(
    page,
    10
  );

  const batches =
    SuperJSON.deserialize<BatchWithDetails[]>(serializedBatches);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Inventory Movements
        </h2>
        <Protect permission="inventory_movements.create">
          <Button asChild>
            <Link href="/inventory/movements/create">
              <Plus className="mr-2 h-4 w-4" /> Record Movement
            </Link>
          </Button>
        </Protect>
      </div>
      <BatchTable batches={batches} totalEntries={total} />
    </div>
  );
}
