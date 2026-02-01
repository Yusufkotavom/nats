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
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseOrderWithDetails } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { CustomPagination } from "@/components/ui/custom-pagination";
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

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

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
      await deletePurchaseOrder(id);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              data?.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.contact.name}</TableCell>
                  <TableCell>
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell>
                    {order.expectedDate
                      ? formatDate(order.expectedDate)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(order.totalAmount))}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <CustomPagination
          currentPage={page}
          totalEntries={data?.total || 0}
          pageSize={10}
        />
      </PageListContent>
    </PageListLayout>
  );
}
