"use client";
export const dynamic = "force-dynamic";

import { getSalesShipments, deleteSalesShipment } from "./actions";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { SalesShipmentFilters } from "./_components/sales-shipment-filters";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { SalesShipmentWithDetails } from "./types";
import { DataTable, Column } from "@/components/ui/data-table";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatDate } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesShipmentsPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const formatDate = useFormatDate();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-shipments", page, search],
    queryFn: async () => {
      const result = await getSalesShipments(page, 10, search);
      return {
        shipments: Array.isArray(result.shipments)
          ? []
          : (SuperJSON.deserialize<SalesShipmentWithDetails[]>(
            result.shipments as SuperJSONResult,
          ) as SalesShipmentWithDetails[]),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
  });

  const confirm = useConfirm();

  const handleDeleteClick = async (id: string) => {
    if (
      await confirm({
        title: "Delete Sales Shipment",
        description:
          "Are you sure you want to delete this shipment? This action cannot be undone.",
        variant: "destructive",
      })
    ) {
      await deleteSalesShipment(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "COMPLETED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: Column<SalesShipmentWithDetails>[] = [
    {
      header: "Shipment #",
      accessorKey: "shipmentNumber",
      className: "font-medium",
    },
    {
      header: "SO #",
      cell: (item) => (
        <Link target="_blank" href={`/sales/orders/${item.salesOrderId}`}>
          <span className="font-medium text-primary">
            {item.salesOrder?.orderNumber || "-"}
          </span>
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (item) =>
        item.contact ? (
          <Link target="_blank"
            href={`/general/contacts/${item.contact.id}`}
            className="text-primary hover:underline"
          >
            {item.contact.name}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      header: "Date",
      accessorKey: "shipmentDate",
      cell: (item) => formatDate(item.shipmentDate),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item) => (
        <Badge className={getStatusColor(item.status)}>
          {item.status}
        </Badge>
      ),
    },
    {
      header: "",
      className: "w-[80px]",
      cell: (shipment) => (
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
              <Link target="_blank" href={`/sales/shipments/${shipment.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Details
              </Link>
            </DropdownMenuItem>
            {shipment.status !== "COMPLETED" && (
              <Protect permission="sales.edit">
                <DropdownMenuItem asChild>
                  <Link target="_blank" href={`/sales/shipments/${shipment.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
              </Protect>
            )}
            <DropdownMenuSeparator />
            {shipment.status !== "COMPLETED" && (
              <Protect permission="sales.delete">
                <DropdownMenuItem
                  className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                  onClick={() => handleDeleteClick(shipment.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </Protect>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Sales Shipments" />
        <PageListActions>
          <Protect permission="sales.create">
            <Button asChild>
              <Link href="/sales/shipments/new">
                <Plus className="mr-2 h-4 w-4" /> New Shipment
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <SalesShipmentFilters />
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={data?.shipments || []}
            columns={columns}
            pagination={{
              totalEntries: data?.total || 0,
              pageSize: 10,
              currentPage: page,
            }}
            emptyMessage="No sales shipments found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
