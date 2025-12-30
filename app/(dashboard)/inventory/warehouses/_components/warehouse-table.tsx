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
import { Pencil, Trash2, MapPin, Eye } from "lucide-react";
import Link from "next/link";
import { deleteWarehouse } from "../actions";
import { WarehouseDialog } from "./warehouse-dialog";

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
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="View Details"
                      >
                        <Link href={`/inventory/warehouses/${warehouse.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <WarehouseDialog
                        warehouse={warehouse}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(warehouse.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
