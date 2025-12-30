import { getLocations, getWarehouse } from "./actions";
import { LocationTable } from "./_components/location-table";
import { LocationDialog } from "./_components/location-dialog";
import { Protect } from "@/components/ui/protect";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ warehouseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { warehouseId } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const { locations, total } = await getLocations(warehouseId, page);
  const warehouse = await getWarehouse(warehouseId);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory/warehouses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {warehouse?.name} - Locations
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage locations/bins for this warehouse
          </p>
        </div>
        <Protect permission="warehouses.edit">
          <LocationDialog warehouseId={warehouseId} />
        </Protect>
      </div>
      <LocationTable
        warehouseId={warehouseId}
        locations={locations}
        totalEntries={total}
      />
    </div>
  );
}
