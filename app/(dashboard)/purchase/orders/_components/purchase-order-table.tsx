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
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { deletePurchaseOrder } from "../actions";
import { PurchaseOrderWithDetails } from "../types";
import { useSearchParams } from "next/navigation";
import { Protect } from "@/components/ui/protect";
import Link from "next/link";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";

interface PurchaseOrderTableProps {
  orders: SuperJSONResult;
  totalPages: number;
  totalEntries: number;
}

export function PurchaseOrderTable({
  orders: serializedOrders,
  totalEntries,
}: PurchaseOrderTableProps) {
  const orders =
    SuperJSON.deserialize<PurchaseOrderWithDetails[]>(serializedOrders);
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();

  const currentPage = Number(searchParams.get("page")) || 1;

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
    <div className="space-y-4">
      <div className="rounded-md border">
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
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.contact.name}</TableCell>
                  <TableCell>
                    {format(new Date(order.orderDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {order.expectedDate
                      ? format(new Date(order.expectedDate), "MMM d, yyyy")
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
      </div>

      <CustomPagination
        currentPage={currentPage}
        totalEntries={totalEntries}
        pageSize={10}
      />
    </div>
  );
}
