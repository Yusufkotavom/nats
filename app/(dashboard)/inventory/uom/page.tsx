"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { UomDialog } from "./_components/uom-dialog";
import { deleteUnit, getUnits } from "./actions";
import { format } from "date-fns";
import { Protect } from "@/components/ui/protect";
import { useConfirm } from "@/hooks/use-confirm";
import { DataTable, Column } from "@/components/ui/data-table";
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
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function UomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = 10;

  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["uom", { page }],
    queryFn: async () => {
      return await getUnits(page, pageSize);
    },
    placeholderData: keepPreviousData,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleAddUnit = () => {
    setSelectedUnit(undefined);
    setIsDialogOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (unit: Unit) => {
    if (
      await confirm({
        title: "Delete Unit",
        description: "Are you sure you want to delete this unit?",
        variant: "destructive",
      })
    ) {
      await deleteUnit(unit.id);
      queryClient.invalidateQueries({ queryKey: ["uom"] });
    }
  };

  const columns: Column<Unit>[] = [
    {
      header: "Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Symbol",
      accessorKey: "symbol",
    },
    {
      header: "Last Updated",
      cell: (unit) => format(new Date(unit.updatedAt), "PP"),
    },
    {
      header: "",
      className: "w-[70px]",
      cell: (unit) => (
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
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Units of Measure" />
        <PageListActions>
          <Protect permission="inventory_products.create">
            <Button onClick={handleAddUnit}>
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <DataTable
          data={data?.data || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No units found."
          pagination={{
            totalEntries: data?.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: handlePageChange,
          }}
        />
      </PageListContent>

      <UomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        unit={selectedUnit}
      />
    </PageListLayout>
  );
}
