"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { Unit } from "@/prisma/generated/prisma/browser";
import { UomDialog } from "./uom-dialog";
import { deleteUnit } from "../actions";
import { format } from "date-fns";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Protect } from "@/components/ui/protect";

interface UomTableProps {
  units: Unit[];
  totalEntries: number;
}

export function UomTable({ units, totalEntries }: UomTableProps) {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | undefined>(undefined);

  const handleAddUnit = () => {
    setSelectedUnit(undefined);
    setIsDialogOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (unit: Unit) => {
    setUnitToDelete(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (unitToDelete) {
      await deleteUnit(unitToDelete.id);
      setIsDeleteDialogOpen(false);
      setUnitToDelete(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-lg font-bold tracking-tight">Units of Measure</h2>
        <Protect permission="inventory_products.create">
          <Button onClick={handleAddUnit}>
            <Plus className="mr-2 h-4 w-4" /> Add Unit
          </Button>
        </Protect>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No units found.
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.symbol}</TableCell>
                  <TableCell>
                    {format(new Date(unit.updatedAt), "PP")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Protect permission="inventory_products.edit">
                          <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        </Protect>
                        <DropdownMenuSeparator />
                        <Protect permission="inventory_products.delete">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(unit)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </Protect>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <UomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        unit={selectedUnit}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete the unit and remove it from our servers."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
