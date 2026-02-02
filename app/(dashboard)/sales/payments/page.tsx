"use client";

import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Trash2, Eye, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  getSalesPayments,
  deleteSalesPayment,
  postSalesPayment,
} from "./actions";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { SalesPaymentFilters } from "./_components/sales-payment-filters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { SalesPaymentWithDetails } from "./types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatDate, useFormatCurrency } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransition } from "react";

export default function SalesPaymentsPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const formatDate = useFormatDate();
  const [isPending, startTransition] = useTransition();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-payments", page, search],
    queryFn: async () => {
      const result = await getSalesPayments(page, 10, search);
      return {
        payments: SuperJSON.deserialize<SalesPaymentWithDetails[]>(
          result.payments,
        ),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handlePost = async (id: string) => {
    if (
      await confirm({
        title: "Post Payment",
        description:
          "Are you sure you want to post this payment to the ledger? This action cannot be undone.",
      })
    ) {
      startTransition(async () => {
        try {
          const result = await postSalesPayment(id);
          if (result.success) {
            toast({ title: "Success", description: "Payment posted successfully" });
            queryClient.invalidateQueries({ queryKey: ["sales-payments"] });
          } else {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to post payment",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: "Delete Payment",
        description:
          "Are you sure you want to delete this payment? This will reverse the transaction and update the invoice status.",
        variant: "destructive",
      })
    ) {
      startTransition(async () => {
        try {
          await deleteSalesPayment(id);
          queryClient.invalidateQueries({ queryKey: ["sales-payments"] });
          toast({
            title: "Success",
            description: "Payment deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete payment",
            variant: "destructive",
          });
        }
      });
    }
  };

  const columns: Column<SalesPaymentWithDetails>[] = [
    {
      header: "Payment #",
      accessorKey: "paymentNumber",
      className: "font-medium",
    },
    {
      header: "Status",
      accessorKey: "journalEntryId",
      cell: (item) =>
        item.journalEntryId ? (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Posted
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Unposted
          </Badge>
        ),
    },
    {
      header: "Date",
      accessorKey: "paymentDate",
      cell: (item) => formatDate(item.paymentDate),
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
      header: "Invoice #",
      cell: (item) => (
        <Link target="_blank" href={`/sales/invoices/${item.salesInvoiceId}`}>
          <span className="font-medium text-primary">
            {item.salesInvoice.invoiceNumber}
          </span>
        </Link>
      ),
    },
    {
      header: "Account",
      cell: (item) => item.cashAccount?.name || "-",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) => formatCurrency(Number(item.amount)),
    },
    {
      header: "",
      className: "w-[50px]",
      cell: (payment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link target="_blank" href={`/sales/payments/${payment.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Link>
            </DropdownMenuItem>
            {!payment.journalEntryId && (
              <Protect permission="sales.create">
                <DropdownMenuItem onClick={() => handlePost(payment.id)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Post
                </DropdownMenuItem>
              </Protect>
            )}
            {!payment.journalEntryId && (
              <Protect permission="sales.delete">
                <DropdownMenuItem
                  onClick={() => handleDelete(payment.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
        <PageListTitle title="Sales Payments" />
        <PageListActions>
          <Protect permission="sales.create">
            <Button asChild>
              <Link href="/sales/payments/new">
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>
      <PageListFilter>
        <SalesPaymentFilters />
      </PageListFilter>
      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={data?.payments || []}
            columns={columns}
            pagination={{
              totalEntries: data?.total || 0,
              pageSize: 10,
              currentPage: page,
            }}
            emptyMessage="No payments found"
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
