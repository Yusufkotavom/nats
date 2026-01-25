"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseInvoices, deletePurchaseInvoice } from "./actions";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseInvoiceFilters } from "./_components/purchase-invoice-filters";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseInvoiceWithDetails } from "./types";
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
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";

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

      <PurchaseInvoiceFilters />

      <PageListContent>
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No purchase invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.contact.name}</TableCell>
                      <TableCell>
                        {invoice.purchaseOrder?.orderNumber || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(invoice.totalAmount))}
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
                              <Link href={`/purchase/invoices/${invoice.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> Details
                              </Link>
                            </DropdownMenuItem>
                            {invoice.status === "DRAFT" && (
                              <>
                                <Protect permission="purchase.edit">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/purchase/invoices/${invoice.id}/edit`}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </Link>
                                  </DropdownMenuItem>
                                </Protect>
                                <DropdownMenuSeparator />
                                <Protect permission="purchase.delete">
                                  <DropdownMenuItem
                                    className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                                    onClick={() =>
                                      handleDeleteClick(invoice.id)
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </Protect>
                              </>
                            )}
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
            currentPage={page}
            totalEntries={data?.total || 0}
            pageSize={10}
          />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
