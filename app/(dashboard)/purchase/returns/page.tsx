"use client";

import { getPurchaseReturns, deletePurchaseReturn } from "./actions";
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
import { PurchaseReturnFilters } from "./_components/purchase-return-filters";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseReturnWithDetails } from "./types";
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
import { useFormatDate } from "@/hooks";

export default function PurchaseReturnsPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const formatDate = useFormatDate();

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-returns", page, search],
    queryFn: async () => {
      const result = await getPurchaseReturns(page, 10, search);
      return {
        returns: SuperJSON.deserialize<PurchaseReturnWithDetails[]>(
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
        title: "Delete Purchase Return",
        description:
          "Are you sure you want to delete this return? This action cannot be undone.",
        variant: "destructive",
      })
    ) {
      await deletePurchaseReturn(id);
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

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Returns" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/returns/new">
                <Plus className="mr-2 h-4 w-4" /> New Return
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <PurchaseReturnFilters />
      </PageListFilter>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
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
            ) : data?.returns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No purchase returns found.
                </TableCell>
              </TableRow>
            ) : (
              data?.returns.map((returnItem) => (
                <TableRow key={returnItem.id}>
                  <TableCell className="font-medium">
                    {returnItem.returnNumber}
                  </TableCell>
                  <TableCell>{returnItem.contact.name}</TableCell>
                  <TableCell>
                    <Link href={`/purchase/orders/${returnItem.purchaseOrderId}`}>
                      <span className="font-medium text-primary">{returnItem.purchaseOrder?.orderNumber || "-"}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/purchase/invoices/${returnItem.purchaseInvoiceId}`}>
                      <span className="font-medium text-primary">{returnItem.purchaseInvoice?.invoiceNumber || "-"}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(returnItem.returnDate)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(returnItem.status)}>
                      {returnItem.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(returnItem.totalAmount))}
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
                          <Link href={`/purchase/returns/${returnItem.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Details
                          </Link>
                        </DropdownMenuItem>
                        {returnItem.status === "DRAFT" && (
                          <>
                            <Protect permission="purchase.edit">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/purchase/returns/${returnItem.id}/edit`}
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
                                  handleDeleteClick(returnItem.id)
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

        <CustomPagination
          currentPage={page}
          totalEntries={data?.total || 0}
          pageSize={10}
        />
      </PageListContent>
    </PageListLayout>
  );
}
