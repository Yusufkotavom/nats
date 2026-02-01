"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseInvoices, deletePurchaseInvoice } from "./actions";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseInvoiceFilters } from "./_components/purchase-invoice-filters";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseInvoiceWithDetails } from "./types";
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

export default function PurchaseInvoicesPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "ALL";

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-invoices", page, search, status],
    queryFn: async () => {
      const result = await getPurchaseInvoices(page, 10, search, status);
      return {
        invoices: SuperJSON.deserialize<PurchaseInvoiceWithDetails[]>(
          result.invoices,
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
        title: "Delete Purchase Invoice",
        description:
          "Are you sure you want to delete this invoice? This action cannot be undone.",
        variant: "destructive",
      })
    ) {
      await deletePurchaseInvoice(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "BILLED":
        return "bg-blue-500";
      case "PARTIALLY_PAID":
        return "bg-yellow-500";
      case "PAID":
        return "bg-green-500";
      case "CANCELED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: Column<PurchaseInvoiceWithDetails>[] = [
    {
      header: "Invoice #",
      accessorKey: "invoiceNumber",
      className: "font-medium",
    },
    {
      header: "Vendor",
      cell: (item) => item.contact?.name || "-",
    },
    {
      header: "PO #",
      cell: (item) => (
        <Link href={`/purchase/orders/${item.purchaseOrderId}`}>
          <span className="font-medium text-primary">
            {item.purchaseOrder?.orderNumber || "-"}
          </span>
        </Link>
      ),
    },
    {
      header: "Date",
      accessorKey: "invoiceDate",
      cell: (item) => formatDate(item.invoiceDate),
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (item) => formatDate(item.dueDate),
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
      header: "Paid Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) => {
        const paidAmount = item.payments.reduce(
          (acc, payment) => acc + Number(payment.amount),
          0,
        );
        return formatCurrency(paidAmount);
      },
    },
    {
      header: "Remaining Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) => {
        const paidAmount = item.payments.reduce(
          (acc, payment) => acc + Number(payment.amount),
          0,
        );
        const remainingAmount = Number(item.totalAmount) - paidAmount;
        return formatCurrency(remainingAmount);
      },
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
      cell: (invoice) => (
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
              <Link href={`/purchase/invoices/${invoice.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Details
              </Link>
            </DropdownMenuItem>
            {invoice.status === "DRAFT" && (
              <>
                <Protect permission="purchase.edit">
                  <DropdownMenuItem asChild>
                    <Link href={`/purchase/invoices/${invoice.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                </Protect>
                <DropdownMenuSeparator />
                <Protect permission="purchase.delete">
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                    onClick={() => handleDeleteClick(invoice.id)}
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
        <PageListTitle title="Purchase Invoices" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/invoices/new">
                <Plus className="mr-2 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <PurchaseInvoiceFilters />
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={data?.invoices || []}
            columns={columns}
            pagination={{
              totalEntries: data?.total || 0,
              pageSize: 10,
              currentPage: page,
            }}
            emptyMessage="No purchase invoices found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
