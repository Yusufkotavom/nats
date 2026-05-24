"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServiceAfterSalesCase,
  getServiceAfterSales,
  getServiceInvoices,
  getServiceOrders,
  getServicePayments,
  settleServiceOrder,
  updateServiceOrderStatus,
} from "../actions";
import type {
  ServiceAfterSalesCaseListItem,
  ServiceInvoiceListItem,
  ServiceOrderListItem,
  ServiceOrderStatus,
  ServicePaymentListItem,
} from "../types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { getOpenPOSSession, getPOSContacts, getPOSServiceProducts } from "../../../pos/actions";
import { SuperJSON } from "@/lib/superjson";
import { ServiceOrderCreateForm } from "../orders/_components/service-order-create-form";

type DashboardTab = "orders" | "invoices" | "payments" | "returns_warranty";

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

export function ServicesDashboard({
  initialTab = "orders",
  lockTab = false,
}: {
  initialTab?: DashboardTab;
  lockTab?: boolean;
}) {
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ServiceOrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [afterSalesStatus, setAfterSalesStatus] = useState<
    "ALL" | "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [afterSalesStartDate, setAfterSalesStartDate] = useState("");
  const [afterSalesEndDate, setAfterSalesEndDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [afterSalesOpen, setAfterSalesOpen] = useState(false);
  const [caseServiceOrderId, setCaseServiceOrderId] = useState("");
  const [caseType, setCaseType] = useState<"RETURN" | "WARRANTY">("RETURN");
  const [caseNotes, setCaseNotes] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("SALES_INVOICE");
  const [previewInput, setPreviewInput] = useState<Record<string, string>>({});
  const [previewTitle, setPreviewTitle] = useState("Print");

  const { toast } = useToast();
  const t = useTranslations("Services");
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const ordersQuery = useQuery({
    queryKey: ["services-orders", page, search, status],
    queryFn: async () => {
      const result = await getServiceOrders(page, 10, search, status);
      return { rows: result.data, total: result.total };
    },
    enabled: tab === "orders" || tab === "returns_warranty",
  });

  const invoicesQuery = useQuery({
    queryKey: ["services-invoices", page, search],
    queryFn: async () => {
      const result = await getServiceInvoices(page, 10, search);
      return { rows: result.data, total: result.total };
    },
    enabled: tab === "invoices",
  });

  const paymentsQuery = useQuery({
    queryKey: ["services-payments", page, search],
    queryFn: async () => {
      const result = await getServicePayments(page, 10, search);
      return { rows: result.data, total: result.total };
    },
    enabled: tab === "payments",
  });

  const createMetaQuery = useQuery({
    queryKey: ["services-create-meta"],
    queryFn: async () => {
      const [sessionRaw, productsRaw, contactsRaw] = await Promise.all([
        getOpenPOSSession(),
        getPOSServiceProducts(),
        getPOSContacts(),
      ]);
      return {
        session: sessionRaw ? SuperJSON.deserialize<{ id: string }>(sessionRaw) : null,
        products: SuperJSON.deserialize<Array<{ id: string; name: string; price: number }>>(productsRaw),
        contacts: SuperJSON.deserialize<Array<{ id: string; name: string }>>(contactsRaw),
      };
    },
  });

  const afterSalesQuery = useQuery({
    queryKey: [
      "services-after-sales",
      page,
      search,
      afterSalesStatus,
      afterSalesStartDate,
      afterSalesEndDate,
    ],
    queryFn: async () => {
      const result = await getServiceAfterSales(
        page,
        10,
        search,
        afterSalesStatus,
        afterSalesStartDate || undefined,
        afterSalesEndDate || undefined,
      );
      return { rows: result.data, total: result.total };
    },
    enabled: tab === "returns_warranty",
  });

  const doneOrders = useMemo(
    () => (ordersQuery.data?.rows || []).filter((row) => row.status === "DONE" || row.status === "CLOSED"),
    [ordersQuery.data?.rows],
  );

  const openPrint = (code: string, input: Record<string, string>, title: string) => {
    setPreviewCode(code);
    setPreviewInput(input);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  const onTransition = async (orderId: string, nextStatus: ServiceOrderStatus) => {
    setPendingActionId(orderId);
    try {
      await updateServiceOrderStatus(orderId, nextStatus);
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      toast({ title: "Status service order berhasil diperbarui" });
    } catch (error) {
      toast({ title: "Gagal update status", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const onSettle = async (order: ServiceOrderListItem) => {
    setPendingActionId(order.id);
    try {
      await settleServiceOrder(order.id, "CASH", Number(order.remainingAmount));
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["services-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
      toast({ title: "Pembayaran service berhasil dicatat" });
    } catch (error) {
      toast({ title: "Gagal mencatat pembayaran", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const handleCreateAfterSalesCase = async () => {
    if (!caseServiceOrderId) {
      toast({ title: "Pilih service order", variant: "destructive" });
      return;
    }
    setCreatingCase(true);
    try {
      await createServiceAfterSalesCase({ serviceOrderId: caseServiceOrderId, caseType, notes: caseNotes });
      await afterSalesQuery.refetch();
      toast({ title: "Case return/garansi berhasil dibuat" });
      setAfterSalesOpen(false);
      setCaseServiceOrderId("");
      setCaseNotes("");
      setCaseType("RETURN");
    } catch (error) {
      toast({ title: "Gagal membuat case", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setCreatingCase(false);
    }
  };

  const orderColumns: Column<ServiceOrderListItem>[] = [
    { header: "Order #", accessorKey: "orderNumber", className: "font-medium" },
    { header: "Tanggal", cell: (item) => formatDate(item.createdAt) },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Invoice", cell: (item) => item.invoiceNumber || "-" },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    { header: "Sisa", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.remainingAmount)) },
    {
      header: "",
      className: "w-[120px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={pendingActionId === item.id}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {nextStatusOptions(item.status).map((nextStatus) => (
              <DropdownMenuItem key={nextStatus} onClick={() => onTransition(item.id, nextStatus)}>
                Set {nextStatus}
              </DropdownMenuItem>
            ))}
            {Number(item.remainingAmount) > 0 ? <DropdownMenuItem onClick={() => onSettle(item)}>Settle Payment</DropdownMenuItem> : null}
            <DropdownMenuSeparator />
            {item.salesOrderId ? (
              <DropdownMenuItem onClick={() => openPrint("SALES_ORDER", { orderId: item.salesOrderId as string }, `Print ${item.orderNumber}`)}>
                Print Order
              </DropdownMenuItem>
            ) : null}
            {item.salesInvoiceId ? (
              <DropdownMenuItem onClick={() => openPrint("SALES_INVOICE", { invoiceId: item.salesInvoiceId as string }, `Print ${item.invoiceNumber || item.orderNumber}`)}>
                Print Invoice
              </DropdownMenuItem>
            ) : null}
            {item.salesInvoiceId ? (
              <DropdownMenuItem onClick={() => openPrint("POS_RECEIPT", { invoiceId: item.salesInvoiceId as string }, `Print Receipt ${item.invoiceNumber || item.orderNumber}`)}>
                Print Receipt
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const invoiceColumns: Column<ServiceInvoiceListItem>[] = [
    { header: "Invoice #", accessorKey: "invoiceNumber", className: "font-medium" },
    { header: "Order #", accessorKey: "orderNumber" },
    { header: "Tanggal", cell: (item) => formatDate(item.invoiceDate) },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    { header: "Balance", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.balanceDue)) },
    {
      header: "",
      className: "w-[90px]",
      cell: (item) => (
        <Button variant="ghost" className="h-8" onClick={() => openPrint("SALES_INVOICE", { invoiceId: item.id }, `Print ${item.invoiceNumber}`)}>
          Print
        </Button>
      ),
    },
  ];

  const paymentColumns: Column<ServicePaymentListItem>[] = [
    { header: "Payment #", accessorKey: "paymentNumber", className: "font-medium" },
    { header: "Invoice #", accessorKey: "invoiceNumber" },
    { header: "Order #", accessorKey: "orderNumber" },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Method", accessorKey: "method" },
    { header: "Tanggal", cell: (item) => formatDate(item.paymentDate) },
    { header: "Amount", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.amount)) },
  ];

  const afterSalesColumns: Column<ServiceAfterSalesCaseListItem>[] = [
    { header: "Case #", accessorKey: "returnNumber", className: "font-medium" },
    { header: "Type", cell: (item) => <Badge>{item.caseType}</Badge> },
    { header: "Order #", accessorKey: "serviceOrderNumber" },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Tanggal", cell: (item) => formatDate(item.returnDate) },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    {
      header: "",
      className: "w-[90px]",
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
              <Link href={`/services/returns-warranty/${item.id}`}>Detail</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/services/returns-warranty/${item.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={tab === "orders" ? t("orders") : tab === "invoices" ? t("invoices") : tab === "payments" ? t("payments") : t("returns_warranty")} />
        <PageListActions>
          {tab === "orders" ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/services/orders/new">Form Page</Link>
              </Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>Buat Service Order</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Buat Service Order</DialogTitle>
                  </DialogHeader>
                  {createMetaQuery.data?.session?.id ? (
                    <ServiceOrderCreateForm
                      compact
                      sessionId={createMetaQuery.data.session.id}
                      products={createMetaQuery.data.products}
                      contacts={createMetaQuery.data.contacts}
                      onSuccess={async () => {
                        setCreateOpen(false);
                        await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
                        await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Tidak ada sesi POS aktif.</p>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          ) : tab === "returns_warranty" ? (
            <Dialog open={afterSalesOpen} onOpenChange={setAfterSalesOpen}>
              <DialogTrigger asChild>
                <Button>Buat Case Return/Garansi</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Buat Case Return/Garansi</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Service Order</Label>
                    <Select value={caseServiceOrderId} onValueChange={setCaseServiceOrderId}>
                      <SelectTrigger><SelectValue placeholder="Pilih order selesai" /></SelectTrigger>
                      <SelectContent>
                        {doneOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>{order.orderNumber} - {order.customerName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipe Case</Label>
                    <Select value={caseType} onValueChange={(value) => setCaseType(value as "RETURN" | "WARRANTY")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETURN">RETURN</SelectItem>
                        <SelectItem value="WARRANTY">WARRANTY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Catatan</Label>
                    <Textarea value={caseNotes} onChange={(event) => setCaseNotes(event.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAfterSalesOpen(false)} disabled={creatingCase}>Batal</Button>
                    <Button onClick={handleCreateAfterSalesCase} disabled={creatingCase}>{creatingCase ? "Menyimpan..." : "Buat Case"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        {!lockTab ? (
          <Tabs value={tab} onValueChange={(value) => { setTab(value as DashboardTab); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="orders">{t("orders")}</TabsTrigger>
              <TabsTrigger value="invoices">{t("invoices")}</TabsTrigger>
              <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
              <TabsTrigger value="returns_warranty">{t("returns_warranty")}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search order/invoice/customer" className="w-full max-w-xs" />
        {tab === "orders" ? (
          <Select value={status} onValueChange={(value) => { setStatus(value as ServiceOrderStatus | "ALL"); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>{statusOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        ) : null}
        {tab === "returns_warranty" ? (
          <>
            <Select
              value={afterSalesStatus}
              onValueChange={(value) => {
                setAfterSalesStatus(
                  value as "ALL" | "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED",
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={afterSalesStartDate}
              onChange={(event) => {
                setAfterSalesStartDate(event.target.value);
                setPage(1);
              }}
              className="w-[170px]"
            />
            <Input
              type="date"
              value={afterSalesEndDate}
              onChange={(event) => {
                setAfterSalesEndDate(event.target.value);
                setPage(1);
              }}
              className="w-[170px]"
            />
          </>
        ) : null}
      </PageListFilter>

      <PageListContent>
        {tab === "orders" ? <DataTable data={ordersQuery.data?.rows ?? []} columns={orderColumns} isLoading={ordersQuery.isLoading} emptyMessage="Belum ada data service" pagination={{ totalEntries: ordersQuery.data?.total ?? 0, pageSize: 10, currentPage: page, onPageChange: setPage }} /> : null}
        {tab === "invoices" ? <DataTable data={invoicesQuery.data?.rows ?? []} columns={invoiceColumns} isLoading={invoicesQuery.isLoading} emptyMessage="Belum ada invoice service" pagination={{ totalEntries: invoicesQuery.data?.total ?? 0, pageSize: 10, currentPage: page, onPageChange: setPage }} /> : null}
        {tab === "payments" ? <DataTable data={paymentsQuery.data?.rows ?? []} columns={paymentColumns} isLoading={paymentsQuery.isLoading} emptyMessage="Belum ada pembayaran service" pagination={{ totalEntries: paymentsQuery.data?.total ?? 0, pageSize: 10, currentPage: page, onPageChange: setPage }} /> : null}
        {tab === "returns_warranty" ? <DataTable data={afterSalesQuery.data?.rows ?? []} columns={afterSalesColumns} isLoading={afterSalesQuery.isLoading} emptyMessage="Belum ada case return/garansi" pagination={{ totalEntries: afterSalesQuery.data?.total ?? 0, pageSize: 10, currentPage: page, onPageChange: setPage }} /> : null}
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
