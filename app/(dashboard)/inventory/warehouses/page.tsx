"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { deleteWarehouse, getWarehouses } from "./actions";
import { WarehouseDialog } from "./_components/warehouse-dialog";
import { Protect } from "@/components/ui/protect";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Inventory,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";

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

export default function WarehousesPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const formatCurrency = useFormatCurrency();
  const [editingWarehouse, setEditingWarehouse] = useState<
    WarehouseWithInventory | undefined
  >(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses", { page }],
    queryFn: async () => {
      return await getWarehouses(page, pageSize);
    },
    placeholderData: keepPreviousData,
  });

  async function handleDelete(id: string) {
    if (
      await confirm({
        title: "Delete Warehouse",
        description: "Are you sure you want to delete this warehouse?",
      })
    ) {
      await deleteWarehouse(id);
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    }
  }

  const handleCreate = () => {
    setEditingWarehouse(undefined);
    setIsDialogOpen(true);
  };

  const columns: Column<WarehouseWithInventory>[] = [
    {
      header: "Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Location",
      cell: (w) => w.location || "-",
    },
    {
      header: "Total Products",
      cell: (w) => new Set(w.inventory.map((i) => i.productId)).size,
    },
    {
      header: "Total Stock Value",
      cell: (w) => {
        const totalValue = w.inventory.reduce(
          (acc, inv) => acc + inv.quantity * Number(inv.product.cost),
          0,
        );
        return formatCurrency(totalValue);
      },
    },
    {
      header: "Actions",
      className: "w-[100px]",
      cell: (warehouse) => (
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
                Details
              </Link>
            </DropdownMenuItem>
            <Protect permission="warehouses.edit">
              <DropdownMenuItem
                onClick={() => {
                  setEditingWarehouse(warehouse);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Protect>
            <Protect permission="warehouses.delete">
              <DropdownMenuItem
                onClick={() => handleDelete(warehouse.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </Protect>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Warehouses" />
        <PageListActions>
          <Protect permission="warehouses.create">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Warehouse
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <DataTable
          data={data?.warehouses || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No warehouses found."
          pagination={{
            totalEntries: data?.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>

      <WarehouseDialog
        key={editingWarehouse?.id}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        warehouse={editingWarehouse}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["warehouses"] });
        }}
      />
    </PageListLayout>
  );
}
