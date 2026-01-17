"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { Location } from "@/prisma/generated/prisma/browser";
import { LocationDialog } from "./location-dialog";
import { deleteLocation } from "../actions";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useSearchParams } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";

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

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No locations found.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.code}</TableCell>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>{location.type}</TableCell>
                  <TableCell className="flex gap-2">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CustomPagination
        totalEntries={totalEntries}
        pageSize={10}
        currentPage={currentPage}
      />
    </div>
  );
}
