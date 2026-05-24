"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServiceAfterSalesCase,
  getServiceOrderForEdit,
  getServiceAfterSales,
  getServiceInvoices,
  getServiceNotifySettings,
  getServiceOrders,
  getServicePayments,
  settleServiceOrder,
  updateServiceOrder,
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
import { MoreHorizontal, Phone, Printer, Trash2, MessageCircle } from "lucide-react";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { getOpenPOSSession, getPOSContacts, getPOSServiceProducts } from "../../../pos/actions";
import { SuperJSON } from "@/lib/superjson";
import { ServiceOrderCreateForm } from "../orders/_components/service-order-create-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

function normalizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
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
  const [previewCode, setPreviewCode] = useState("SERVICE_INVOICE");
  const [previewInput, setPreviewInput] = useState<Record<string, string>>({});
  const [previewTitle, setPreviewTitle] = useState("Print");
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState("");
  const [editItems, setEditItems] = useState<Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    notes: string;
  }>>([]);
  const [editNotesValue, setEditNotesValue] = useState("");
  const [editStatusValue, setEditStatusValue] = useState<ServiceOrderStatus>("NEW");
  const [editStatusOptions, setEditStatusOptions] = useState<ServiceOrderStatus[]>(["NEW"]);

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
        products: SuperJSON.deserialize<Array<{ id: string; name: string; price: number; isService?: boolean }>>(productsRaw),
        contacts: SuperJSON.deserialize<Array<{ id: string; name: string }>>(contactsRaw),
      };
    },
  });
  const notifySettingsQuery = useQuery({
    queryKey: ["services-notify-settings"],
    queryFn: async () => {
      const raw = await getServiceNotifySettings();
      return SuperJSON.deserialize<{
        serviceTemplateCreated: string;
        serviceTemplateReady: string;
        serviceTemplateCostDone: string;
        serviceTemplatePickedUp: string;
        serviceWarrantyDuration: number;
        serviceWarrantyUnit: "DAY" | "MONTH";
      }>(raw);
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

  const openWhatsApp = (order: ServiceOrderListItem) => {
    const normalized = normalizePhoneForWhatsApp(order.customerPhone);
    if (!normalized) {
      toast({ title: "Nomor telepon customer tidak tersedia", variant: "destructive" });
      return;
    }
    const settings = notifySettingsQuery.data;
    const warrantyText =
      settings && settings.serviceWarrantyDuration > 0
        ? `${settings.serviceWarrantyDuration} ${settings.serviceWarrantyUnit === "MONTH" ? "bulan" : "hari"}`
        : "-";
    const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
    const origin = window.location.origin;
    const invoiceUrl = order.salesInvoiceId
      ? `${origin}/${locale}/reporting/preview?code=SERVICE_INVOICE&invoiceId=${order.salesInvoiceId}`
      : "-";
    const invoiceNumber = order.invoiceNumber || "-";
    const noInvoice = order.salesInvoiceId ? "" : "Belum ada invoice";

    const templateByStatus =
      order.status === "NEW"
        ? settings?.serviceTemplateCreated
        : order.status === "READY"
          ? settings?.serviceTemplateReady
          : order.status === "DONE"
            ? settings?.serviceTemplateCostDone
            : settings?.serviceTemplatePickedUp;

    let messageText =
      templateByStatus?.trim() ||
      `Halo {{customer_name}}, update service order {{order_number}} status {{status}}.`;
    const replacements: Record<string, string> = {
      customer_name: order.customerName,
      order_number: order.orderNumber,
      status: order.status,
      invoice_number: invoiceNumber,
      invoice_url: invoiceUrl,
      no_invoice: noInvoice || "-",
      warranty_text: warrantyText,
      total_amount: Number(order.totalAmount || 0).toLocaleString("id-ID"),
      remaining_amount: Number(order.remainingAmount || 0).toLocaleString("id-ID"),
      target_date: order.targetDate ? formatDate(order.targetDate) : "-",
    };
    Object.entries(replacements).forEach(([key, value]) => {
      messageText = messageText.replaceAll(`{{${key}}}`, value);
    });
    const message = encodeURIComponent(messageText);
    window.open(`https://wa.me/${normalized}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const openCall = (order: ServiceOrderListItem) => {
    const normalized = normalizePhoneForWhatsApp(order.customerPhone);
    if (!normalized) {
      toast({ title: "Nomor telepon customer tidak tersedia", variant: "destructive" });
      return;
    }
    window.open(`tel:+${normalized}`, "_self");
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

  const openEditOrder = async (order: ServiceOrderListItem) => {
    setEditOrderId(order.id);
    setPendingActionId(order.id);
    try {
      const raw = await getServiceOrderForEdit(order.id);
      const detail = SuperJSON.deserialize<{
        id: string;
        status: ServiceOrderStatus;
        notes: string;
        items: Array<{
          id: string;
          productId: string;
          quantity: number;
          unitPrice: number;
          notes: string;
        }>;
      }>(raw);
      setEditItems(detail.items);
      setEditNotesValue(detail.notes || "");
      setEditStatusValue(detail.status);
      setEditStatusOptions([detail.status, ...nextStatusOptions(detail.status)]);
      setEditOrderOpen(true);
    } catch (error) {
      toast({ title: "Gagal load detail order", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const onSaveOrderEdit = async () => {
    if (!editOrderId) return;
    setPendingActionId(editOrderId);
    try {
      await updateServiceOrder({
        orderId: editOrderId,
        status: editStatusValue,
        notes: editNotesValue.trim() || undefined,
        items: editItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes.trim() || undefined,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["services-payments"] });
      toast({ title: "Service order berhasil diperbarui" });
      setEditOrderOpen(false);
    } catch (error) {
      toast({ title: "Gagal update service order", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const addEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, notes: "" },
    ]);
  };

  const removeEditItem = (id: string) => {
    setEditItems((prev) => prev.filter((item) => item.id !== id));
  };

  const changeEditItem = (
    id: string,
    patch: Partial<{ productId: string; quantity: number; unitPrice: number; notes: string }>,
  ) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId !== undefined) {
          const selected = createMetaQuery.data?.products.find((product) => product.id === patch.productId);
          if (selected) next.unitPrice = selected.price;
        }
        return next;
      }),
    );
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
            <DropdownMenuItem onClick={() => openEditOrder(item)}>Edit</DropdownMenuItem>
            {Number(item.remainingAmount) > 0 ? <DropdownMenuItem onClick={() => onSettle(item)}>Settle Payment</DropdownMenuItem> : null}
            <DropdownMenuSeparator />
            {item.salesOrderId ? (
              <DropdownMenuItem onClick={() => openPrint("SERVICE_WORK_ORDER", { orderId: item.salesOrderId as string }, `Print ${item.orderNumber}`)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Order
              </DropdownMenuItem>
            ) : null}
            {item.salesInvoiceId ? (
              <DropdownMenuItem onClick={() => openPrint("SERVICE_INVOICE", { invoiceId: item.salesInvoiceId as string }, `Print ${item.invoiceNumber || item.orderNumber}`)}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => openWhatsApp(item)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCall(item)}>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </DropdownMenuItem>
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
        <Button variant="ghost" className="h-8" onClick={() => openPrint("SERVICE_INVOICE", { invoiceId: item.id }, `Print ${item.invoiceNumber}`)}>
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
      <Dialog open={editOrderOpen} onOpenChange={setEditOrderOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Service Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={editStatusValue} onValueChange={(value) => setEditStatusValue(value as ServiceOrderStatus)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {editStatusOptions.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {statusOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Ordered Items</Label>
                <Button type="button" variant="outline" onClick={addEditItem}>Tambah Item</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[110px]">Quantity</TableHead>
                    <TableHead className="w-[160px]">Price</TableHead>
                    <TableHead className="w-[56px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">No items added.</TableCell>
                    </TableRow>
                  ) : (
                    editItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select value={item.productId} onValueChange={(value) => changeEditItem(item.id, { productId: value })}>
                            <SelectTrigger><SelectValue placeholder="Pilih produk/service" /></SelectTrigger>
                            <SelectContent>
                              {(createMetaQuery.data?.products || []).map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}{product.isService ? " (Service)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="mt-2"
                            placeholder="Catatan item"
                            value={item.notes}
                            onChange={(event) => changeEditItem(item.id, { notes: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={1} value={item.quantity} onChange={(event) => changeEditItem(item.id, { quantity: Number(event.target.value) || 1 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={item.unitPrice} onChange={(event) => changeEditItem(item.id, { unitPrice: Number(event.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeEditItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-2">
              <Label>Catatan</Label>
              <Textarea value={editNotesValue} onChange={(event) => setEditNotesValue(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOrderOpen(false)}>Batal</Button>
              <Button onClick={onSaveOrderEdit} disabled={!editOrderId || pendingActionId === editOrderId}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageListLayout>
  );
}
