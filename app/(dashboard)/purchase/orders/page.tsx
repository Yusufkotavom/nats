"use client";

import { getPurchaseOrders, deletePurchaseOrder } from "./actions";
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
import { PurchaseOrderFilters } from "./_components/purchase-order-filters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseOrderWithDetails } from "./types";
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
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: [
      "purchase-orders",
      page,
      search,
      status,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const result = await getPurchaseOrders(
        page,
        10,
        search,
        status,
        startDate || undefined,
        endDate || undefined
      );
      return {
        orders: SuperJSON.deserialize<PurchaseOrderWithDetails[]>(
          result.orders
        ),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const confirm = useConfirm();

  const handleDeleteClick = async (id: string) => {
    if (
      await confirm({
        title: "Delete Purchase Order",
        description:
          "Are you sure you want to delete this purchase order? This action cannot be undone.",
        confirmText: "Delete",
        variant: "destructive",
      })
    ) {
      startTransition(async () => {
        try {
          await deletePurchaseOrder(id);
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          toast({
            title: "Success",
            description: "Purchase order deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete purchase order",
            variant: "destructive",
          });
        }
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "ISSUED":
        return "bg-blue-500";
      case "PARTIALLY_RECEIVED":
        return "bg-yellow-500";
      case "CLOSED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: Column<PurchaseOrderWithDetails>[] = [
    {
      header: "PO Number",
      accessorKey: "orderNumber",
      className: "font-medium",
    },
    {
      header: "Vendor",
      cell: (item) => item.contact?.name || "-",
    },
    {
      header: "Date",
      accessorKey: "orderDate",
      cell: (item) => formatDate(item.orderDate),
    },
    {
      header: "Expected",
      accessorKey: "expectedDate",
      cell: (item) =>
        item.expectedDate ? formatDate(item.expectedDate) : "-",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item) => (
        <Badge className={getStatusColor(item.status)}>
          {item.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Total Amount",
      accessorKey: "totalAmount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) => formatCurrency(Number(item.totalAmount)),
    },
    {
      header: "",
      className: "w-[80px]",
      cell: (order) => (
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
              <Link href={`/purchase/orders/${order.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Details
              </Link>
            </DropdownMenuItem>
            <Protect permission="purchase.edit">
              <DropdownMenuItem asChild>
                <Link href={`/purchase/orders/${order.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
            </Protect>
            <DropdownMenuSeparator />
            <Protect permission="purchase.delete">
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                onClick={() => handleDeleteClick(order.id)}
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
        <PageListTitle title="Purchase Orders" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/orders/new">
                <Plus className="mr-2 h-4 w-4" /> New Order
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>
      <PageListFilter>
        <PurchaseOrderFilters />
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={data?.orders || []}
            columns={columns}
            pagination={{
              totalEntries: data?.total || 0,
              pageSize: 10,
              currentPage: page,
            }}
            emptyMessage="No purchase orders found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
