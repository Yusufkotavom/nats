"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { getServicePayments } from "../actions";
import type { ServicePaymentListItem } from "../../types";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatCurrency, useFormatDate } from "@/hooks";

export function ServicePaymentsList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const paymentsQuery = useQuery({
    queryKey: ["services-payments-standalone", page, search],
    queryFn: async () => {
      const result = await getServicePayments(page, 10, search);
      return { rows: result.data, total: result.total };
    },
  });

  const columns: Column<ServicePaymentListItem>[] = [
    { header: "Payment #", accessorKey: "paymentNumber", className: "font-medium" },
    { header: "Invoice #", accessorKey: "invoiceNumber" },
    { header: "Order #", accessorKey: "orderNumber" },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Method", accessorKey: "method" },
    { header: "Tanggal", cell: (item) => formatDate(item.paymentDate) },
    { header: "Amount", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.amount)) },
    {
      header: "",
      className: "w-[120px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/services/pipeline/${item.serviceOrderId}`}>Open in Pipeline</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/sales/payments/${item.id}`}>Open Payment</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/sales/invoices/${item.salesInvoiceId}`}>Open Invoice</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Service Payments" />
        <PageListActions />
      </PageListHeader>
      <PageListFilter>
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search payment/invoice/customer"
          className="w-full max-w-xs"
        />
      </PageListFilter>
      <PageListContent>
        <DataTable
          data={paymentsQuery.data?.rows ?? []}
          columns={columns}
          isLoading={paymentsQuery.isLoading}
          emptyMessage="Belum ada pembayaran service"
          pagination={{
            totalEntries: paymentsQuery.data?.total ?? 0,
            pageSize: 10,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>
    </PageListLayout>
  );
}
