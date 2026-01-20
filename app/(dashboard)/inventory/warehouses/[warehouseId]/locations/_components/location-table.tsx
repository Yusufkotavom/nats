"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Location } from "@/prisma/generated/prisma/browser";
import { LocationDialog } from "./location-dialog";
import { deleteLocation } from "../actions";
import { useSearchParams } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { DataTable, Column } from "@/components/ui/data-table";

interface LocationTableProps {
  warehouseId: string;
  locations: Location[];
  totalEntries: number;
}

export function LocationTable({
  warehouseId,
  locations,
  totalEntries,
}: LocationTableProps) {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const confirm = useConfirm();

  async function handleDelete(id: string) {
    if (
      await confirm({
        title: "Delete Location",
        description: "Are you sure you want to delete this location?",
        variant: "destructive",
      })
    ) {
      await deleteLocation(id);
    }
  }

  const columns: Column<Location>[] = [
    {
      header: "Code",
      accessorKey: "code",
      className: "font-medium",
    },
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Type",
      accessorKey: "type",
    },
    {
      header: "Actions",
      className: "w-[100px]",
      cell: (location) => (
        <div className="flex gap-2">
          <LocationDialog
            warehouseId={warehouseId}
            location={location}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(location.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <DataTable
          data={locations}
          columns={columns}
          emptyMessage="No locations found."
          pagination={{
            totalEntries,
            pageSize: 10,
            currentPage,
          }}
        />
      </div>
    </div>
  );
}
