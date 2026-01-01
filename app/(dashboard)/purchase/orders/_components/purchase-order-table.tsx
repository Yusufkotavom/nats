"use client";

import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Eye, Pencil, Trash2, X } from "lucide-react";
import { deletePurchaseOrder } from "../actions";
import { useState, useEffect } from "react";
import { PurchaseOrderWithDetails } from "../types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderStatus } from "@/prisma/generated/prisma/enums";

interface PurchaseOrderTableProps {
  orders: PurchaseOrderWithDetails[];
  totalPages: number;
  totalEntries: number;
}

export function PurchaseOrderTable({
  orders,
  totalEntries,
}: PurchaseOrderTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const formatCurrency = useFormatCurrency();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "ALL"
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | undefined>(
    undefined
  );

  const currentPage = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }

      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      } else {
        params.delete("status");
      }

      if (startDate) {
        params.set("startDate", startDate);
      } else {
        params.delete("startDate");
      }

      if (endDate) {
        params.set("endDate", endDate);
      } else {
        params.delete("endDate");
      }

      params.set("page", "1");

      const currentSearch = searchParams.get("search") || "";
      const currentStatus = searchParams.get("status") || "ALL";
      const currentStartDate = searchParams.get("startDate") || "";
      const currentEndDate = searchParams.get("endDate") || "";

      if (
        searchTerm !== currentSearch ||
        statusFilter !== currentStatus ||
        startDate !== currentStartDate ||
        endDate !== currentEndDate
      ) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchTerm,
    statusFilter,
    startDate,
    endDate,
    searchParams,
    pathname,
    replace,
  ]);

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (orderToDelete) {
      await deletePurchaseOrder(orderToDelete);
      setIsDeleteDialogOpen(false);
      setOrderToDelete(undefined);
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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <CustomInput
              placeholder="Search orders..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.values(PurchaseOrderStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <CustomInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">-</span>
              <CustomInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
                placeholder="End Date"
              />
            </div>

            {(searchTerm || statusFilter !== "ALL" || startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

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

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this purchase order? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
