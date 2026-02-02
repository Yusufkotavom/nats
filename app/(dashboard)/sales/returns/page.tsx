"use client";

import { getSalesReturns, deleteSalesReturn } from "./actions";
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
import { SalesReturnFilters } from "./_components/sales-return-filters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { SalesReturnWithDetails } from "./types";
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
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatDate } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SalesReturnsPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const formatDate = useFormatDate();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-returns", page, search],
    queryFn: async () => {
      const result = await getSalesReturns(page, 10, search);
      return {
        returns: SuperJSON.deserialize<SalesReturnWithDetails[]>(
          result.returns,
        ),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
  });

  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();

  const handleDeleteClick = async (id: string) => {
    if (
      await confirm({
        title: "Delete Sales Return",
        description:
          "Are you sure you want to delete this return? This action cannot be undone.",
        variant: "destructive",
      })
    ) {
      startTransition(async () => {
        try {
          await deleteSalesReturn(id);
          queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
          toast({
            title: "Success",
            description: "Sales return deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete sales return",
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
      case "APPROVED":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: Column<SalesReturnWithDetails>[] = [
    {
      header: "Return #",
      accessorKey: "returnNumber",
      className: "font-medium",
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
      header: "Invoice #",
      cell: (item) => (
        <Link target="_blank" href={`/sales/invoices/${item.salesInvoiceId}`}>
          <span className="font-medium text-primary">
            {item.salesInvoice?.invoiceNumber || "-"}
          </span>
        </Link>
      ),
    },
    {
      header: "Date",
      accessorKey: "returnDate",
      cell: (item) => formatDate(item.returnDate),
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
      header: "Total Amount",
      accessorKey: "totalAmount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) => formatCurrency(Number(item.totalAmount)),
    },
    {
      header: "",
      className: "w-[80px]",
      cell: (returnItem) => (
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
              <Link target="_blank" href={`/sales/returns/${returnItem.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Details
              </Link>
            </DropdownMenuItem>
            {returnItem.status === "DRAFT" && (
              <>
                <Protect permission="sales.edit">
                  <DropdownMenuItem asChild>
                    <Link target="_blank" href={`/sales/returns/${returnItem.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                </Protect>
                <DropdownMenuSeparator />
                <Protect permission="sales.delete">
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                    onClick={() => handleDeleteClick(returnItem.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </Protect>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Sales Returns" />
        <PageListActions>
          <Protect permission="sales.create">
            <Button asChild>
              <Link href="/sales/returns/new">
                <Plus className="mr-2 h-4 w-4" /> New Return
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <SalesReturnFilters />
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={data?.returns || []}
            columns={columns}
            pagination={{
              totalEntries: data?.total || 0,
              pageSize: 10,
              currentPage: page,
            }}
            emptyMessage="No sales returns found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
