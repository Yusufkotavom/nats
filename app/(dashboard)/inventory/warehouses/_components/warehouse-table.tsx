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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { deleteWarehouse } from "../actions";
import { WarehouseDialog } from "./warehouse-dialog";
import { useState } from "react";

import {
  Inventory,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useSearchParams } from "next/navigation";
import { useFormatCurrency } from "@/hooks/use-format-currency";

type WarehouseWithInventory = Warehouse & {
  inventory: (Omit<Inventory, "unitCost"> & { unitCost: number } & {
    product: Omit<
      Product,
      | "price"
      | "cost"
      | "averageCost"
      | "purchaseConversionFactor"
      | "salesConversionFactor"
    > & {
      price: number;
      cost: number;
      averageCost: number;
      purchaseConversionFactor: number;
      salesConversionFactor: number;
    };
  })[];
};

interface WarehouseTableProps {
  warehouses: WarehouseWithInventory[];
  totalEntries: number;
}

export function WarehouseTable({
  warehouses,
  totalEntries,
}: WarehouseTableProps) {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const formatCurrency = useFormatCurrency();
  const [editingWarehouse, setEditingWarehouse] = useState<
    WarehouseWithInventory | undefined
  >(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this warehouse?")) {
      await deleteWarehouse(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Total Products</TableHead>
              <TableHead>Total Stock Value</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No warehouses found.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((warehouse) => {
                const uniqueProducts = new Set(
                  warehouse.inventory.map((i) => i.productId)
                ).size;
                const totalValue = warehouse.inventory.reduce(
                  (acc, inv) => acc + inv.quantity * Number(inv.product.cost),
                  0
                );

                return (
                  <TableRow key={warehouse.id} className="border-b">
                    <TableCell className="font-medium">
                      {warehouse.name}
                    </TableCell>
                    <TableCell>{warehouse.location || "-"}</TableCell>
                    <TableCell>{uniqueProducts}</TableCell>
                    <TableCell>{formatCurrency(totalValue)}</TableCell>
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
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/inventory/warehouses/${warehouse.id}`}
                              className="flex items-center"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingWarehouse(warehouse);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(warehouse.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
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
