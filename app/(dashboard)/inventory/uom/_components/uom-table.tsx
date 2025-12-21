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
import { Unit } from "@/prisma/generated/prisma/client";
import { UomDialog } from "./uom-dialog";
import { deleteUnit } from "../actions";
import { format } from "date-fns";

interface UomTableProps {
  units: Unit[];
}

export function UomTable({ units }: UomTableProps) {
  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this unit?")) {
      const res = await deleteUnit(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
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
                <TableCell>{format(new Date(unit.updatedAt), "PP")}</TableCell>
                <TableCell className="flex gap-2">
                  <UomDialog
                    unit={unit}
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(unit.id)}
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
  );
}
