"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, MessageCircle, Phone, Printer } from "lucide-react";
import { getServiceOrders, settleServiceOrder, updateServiceOrderStatus } from "../actions";
import type { ServiceOrderListItem, ServiceOrderStatus } from "../../types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const statusOptions: Array<ServiceOrderStatus | "ALL"> = [
  "ALL",
  "NEW",
  "PROCESSING",
  "READY",
  "DONE",
  "CLOSED",
  "CANCELLED",
];

function getStatusColor(status: ServiceOrderStatus | string) {
  switch (status) {
    case "NEW":
      return "bg-gray-500";
    case "PROCESSING":
      return "bg-blue-500";
    case "READY":
      return "bg-yellow-500";
    case "DONE":
      return "bg-purple-500";
    case "CLOSED":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function nextStatusOptions(status: ServiceOrderStatus): ServiceOrderStatus[] {
  const map: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
    NEW: ["PROCESSING", "READY", "CANCELLED"],
    PROCESSING: ["READY", "DONE", "CANCELLED"],
    READY: ["DONE", "CANCELLED"],
    DONE: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  return map[status];
}

export function ServiceOrdersList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ServiceOrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("SERVICE_WORK_ORDER");
  const [previewInput, setPreviewInput] = useState<Record<string, string>>({});
  const [previewTitle, setPreviewTitle] = useState("Print Service Order");
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();

  const ordersQuery = useQuery({
    queryKey: ["services-orders-standalone", page, search, status],
    queryFn: async () => {
      const result = await getServiceOrders(page, 10, search, status);
      return { rows: result.data, total: result.total };
    },
  });

  const handleUpdateStatus = async (id: string, nextStatus: ServiceOrderStatus) => {
    try {
      setPendingId(id);
      await updateServiceOrderStatus(id, nextStatus);
      await ordersQuery.refetch();
      toast({ title: `Status berhasil diubah ke ${nextStatus}` });
    } catch (error) {
      toast({
        title: "Gagal update status",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleSettle = async (id: string) => {
    try {
      setPendingId(id);
      await settleServiceOrder(id);
      await ordersQuery.refetch();
      toast({ title: "Pembayaran service berhasil diposting" });
    } catch (error) {
      toast({
        title: "Gagal settle pembayaran",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  const rows = useMemo(() => ordersQuery.data?.rows ?? [], [ordersQuery.data?.rows]);

  const columns: Column<ServiceOrderListItem>[] = [
    { header: "Order #", accessorKey: "orderNumber", className: "font-medium" },
    { header: "Tanggal", cell: (item) => formatDate(item.createdAt) },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Product", accessorKey: "primaryProductName" },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    { header: "Remaining", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.remainingAmount)) },
    {
      header: "",
      className: "w-[120px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={pendingId === item.id}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/services/orders/${item.id}`}>Detail</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/services/pipeline/${item.id}`}>Open in Pipeline</Link>
            </DropdownMenuItem>
            {nextStatusOptions(item.status).map((nextStatus) => (
              <DropdownMenuItem key={nextStatus} onClick={() => handleUpdateStatus(item.id, nextStatus)}>
                Mark as {nextStatus}
              </DropdownMenuItem>
            ))}
            {Number(item.remainingAmount) > 0 ? (
              <DropdownMenuItem onClick={() => handleSettle(item.id)}>
                Settle Payment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {item.salesOrderId ? (
              <DropdownMenuItem
                onClick={() => {
                  setPreviewCode("SERVICE_WORK_ORDER");
                  setPreviewInput({ orderId: item.salesOrderId as string });
                  setPreviewTitle(`Print ${item.orderNumber}`);
                  setPreviewOpen(true);
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Order
              </DropdownMenuItem>
            ) : null}
            {item.salesInvoiceId ? (
              <DropdownMenuItem
                onClick={() => {
                  setPreviewCode("SERVICE_INVOICE");
                  setPreviewInput({ invoiceId: item.salesInvoiceId as string });
                  setPreviewTitle(`Print ${item.invoiceNumber || item.orderNumber}`);
                  setPreviewOpen(true);
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Service Work Orders" />
        <PageListActions>
          <Button asChild>
            <Link href="/services/orders/new">Buat Service Order</Link>
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListFilter>
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search order/customer"
          className="w-full max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ServiceOrderStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((value) => (
              <SelectItem key={value} value={value}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageListFilter>
      <PageListContent>
        <DataTable
          data={rows}
          columns={columns}
          isLoading={ordersQuery.isLoading}
          emptyMessage="Belum ada data service"
          pagination={{
            totalEntries: ordersQuery.data?.total ?? 0,
            pageSize: 10,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>
      <ReportPreviewDialog
        isOpen={previewOpen}
        onOpenChange={setPreviewOpen}
        code={previewCode}
        input={previewInput}
        title={previewTitle}
      />
    </PageListLayout>
  );
}
