"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Printer } from "lucide-react";
import { getServiceInvoices, settleServiceOrder } from "../actions";
import type { ServiceInvoiceListItem } from "../../types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";

function getStatusColor(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-500";
    case "PARTIALLY_PAID":
      return "bg-yellow-500";
    case "ISSUED":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

export function ServiceInvoicesList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInput, setPreviewInput] = useState<Record<string, string>>({});
  const [previewTitle, setPreviewTitle] = useState("Print Service Invoice");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const { toast } = useToast();

  const invoicesQuery = useQuery({
    queryKey: ["services-invoices-standalone", page, search],
    queryFn: async () => {
      const result = await getServiceInvoices(page, 10, search);
      return { rows: result.data, total: result.total };
    },
  });

  const handleSettle = async (item: ServiceInvoiceListItem) => {
    try {
      setPendingOrderId(item.serviceOrderId);
      await settleServiceOrder(item.serviceOrderId);
      await invoicesQuery.refetch();
      toast({ title: "Pembayaran berhasil diposting" });
    } catch (error) {
      toast({
        title: "Gagal settle invoice",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setPendingOrderId(null);
    }
  };

  const columns: Column<ServiceInvoiceListItem>[] = [
    { header: "Invoice #", accessorKey: "invoiceNumber", className: "font-medium" },
    { header: "Order #", accessorKey: "orderNumber" },
    { header: "Tanggal", cell: (item) => formatDate(item.invoiceDate) },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    { header: "Balance", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.balanceDue)) },
    {
      header: "",
      className: "w-[120px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={pendingOrderId === item.serviceOrderId}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/services/pipeline/${item.serviceOrderId}`}>Open in Pipeline</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/sales/invoices/${item.id}`}>Open Invoice</Link>
            </DropdownMenuItem>
            {Number(item.balanceDue) > 0 ? (
              <DropdownMenuItem onClick={() => handleSettle(item)}>
                Settle Payment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setPreviewInput({ invoiceId: item.id });
                setPreviewTitle(`Print ${item.invoiceNumber}`);
                setPreviewOpen(true);
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Service Invoices" />
        <PageListActions />
      </PageListHeader>
      <PageListFilter>
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search order/invoice/customer"
          className="w-full max-w-xs"
        />
      </PageListFilter>
      <PageListContent>
        <DataTable
          data={invoicesQuery.data?.rows ?? []}
          columns={columns}
          isLoading={invoicesQuery.isLoading}
          emptyMessage="Belum ada invoice service"
          pagination={{
            totalEntries: invoicesQuery.data?.total ?? 0,
            pageSize: 10,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>
      <ReportPreviewDialog
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        code="SERVICE_INVOICE"
        input={previewInput}
        title={previewTitle}
      />
    </PageListLayout>
  );
}
