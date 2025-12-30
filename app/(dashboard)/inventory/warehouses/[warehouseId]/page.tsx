import { getWarehouse, getWarehouseInventory, getCategories } from "./actions";
import { InventoryTable } from "./_components/inventory-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

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
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;
  const categoryId =
    typeof resolvedSearchParams.categoryId === "string"
      ? resolvedSearchParams.categoryId
      : undefined;

  const [warehouse, categories, { inventory, total }] = await Promise.all([
    getWarehouse(warehouseId),
    getCategories(),
    getWarehouseInventory(warehouseId, page, 10, search, categoryId),
  ]);

  if (!warehouse) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold tracking-tight">{warehouse.name}</h2>
          <p className="text-sm text-muted-foreground">{warehouse.location}</p>
        </div>
      </div>

      <InventoryTable
        inventory={inventory}
        categories={categories}
        totalEntries={total}
      />
    </div>
  );
}
