import { getMovementBatches } from "./actions";
import { BatchTable, BatchWithDetails } from "./_components/batch-table";
import { Protect } from "@/components/protect";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function Page() {
  const batches = await getMovementBatches();

  // Convert Decimals to numbers for client component serialization
  const formattedBatches = batches.map((batch) => ({
    ...batch,
    details: batch.details.map((detail) => ({
      ...detail,
      unitCost: Number(detail.unitCost),
      product: {
        ...detail.product,
        price: Number(detail.product.price),
        cost: Number(detail.product.cost),
        averageCost: Number(detail.product.averageCost),
        purchaseConversionFactor: Number(
          detail.product.purchaseConversionFactor
        ),
        salesConversionFactor: Number(detail.product.salesConversionFactor),
      },
    })),
  }));

  // Cast to specific type to match component props
  const typedBatches = formattedBatches as unknown as BatchWithDetails[];

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
      <BatchTable batches={typedBatches} />
    </div>
  );
}
