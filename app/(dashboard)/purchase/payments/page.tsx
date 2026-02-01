"use client";

import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Trash2, Eye, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  getPurchasePayments,
  deletePurchasePayment,
  postPurchasePayment,
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
import { PurchasePaymentFilters } from "./_components/purchase-payment-filters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchasePaymentWithDetails } from "./types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";

export default function PurchasePaymentsPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-payments", page, search],
    queryFn: async () => {
      const result = await getPurchasePayments(page, 10, search);
      return {
        payments: SuperJSON.deserialize<PurchasePaymentWithDetails[]>(
          result.payments,
        ),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
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
      const result = await postPurchasePayment(id);
      if (result.success) {
        toast({ title: "Success", description: "Payment posted successfully" });
        queryClient.invalidateQueries({ queryKey: ["purchase-payments"] });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
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
      await deletePurchasePayment(id);
      queryClient.invalidateQueries({ queryKey: ["purchase-payments"] });
    }
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Payments" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/payments/new">
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>
      <PageListFilter>
        <PurchasePaymentFilters />
      </PageListFilter>
      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              data?.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.paymentNumber}
                  </TableCell>
                  <TableCell>
                    {payment.journalEntryId ? (
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
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{payment.contact.name}</TableCell>
                  <TableCell>
                    {payment.purchaseInvoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{payment.cashAccount.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(payment.amount))}
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/purchase/payments/${payment.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {!payment.journalEntryId && (
                          <Protect permission="purchase.create">
                            <DropdownMenuItem onClick={() => handlePost(payment.id)}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              Post to Ledger
                            </DropdownMenuItem>
                          </Protect>
                        )}
                        <Protect permission="purchase.delete">
                          <DropdownMenuItem
                            onClick={() => handleDelete(payment.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
        <CustomPagination totalEntries={data?.total || 0} pageSize={10} />
      </PageListContent>
    </PageListLayout>
  );
}
