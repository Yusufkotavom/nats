"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServiceOrder,
  createServiceAfterSalesCase,
  createServiceQuickContact,
  getServiceCreateMeta,
  getServicePaymentMethods,
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
import { MoreHorizontal, Phone, Printer, Trash2, MessageCircle, Wrench, NotebookPen, CircleDashed } from "lucide-react";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { SuperJSON } from "@/lib/superjson";
import { ServiceOrderCreateForm } from "../orders/_components/service-order-create-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCompanyCommunicationPreview, createPublicTrackingLink } from "@/app/[locale]/communications/actions";
import {
  normalizePhoneForWhatsApp,
} from "@/lib/communication/company-communication";
import { TableOverflow } from "@/components/ui/table-overflow";

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
  initialEditOrderId,
}: {
  initialTab?: DashboardTab;
  lockTab?: boolean;
  initialEditOrderId?: string;
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
  const [editOrderMeta, setEditOrderMeta] = useState<{
    orderNumber: string;
    salesOrderId: string | null;
    salesOrderNumber: string | null;
    salesInvoiceId: string | null;
    invoiceNumber: string | null;
    subtotal: number;
    totalAmount: number;
    dpAmount: number;
    paidAmount: number;
    remainingAmount: number;
    latestPayment: {
      id: string;
      paymentNumber: string;
      paymentDate: Date;
      method: string;
      amount: number;
    } | null;
  } | null>(null);
  const [settleCashAccountId, setSettleCashAccountId] = useState<string>("");
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<"CASH" | "BANK">("CASH");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [editInitialSnapshot, setEditInitialSnapshot] = useState("");
  const [autoOpenedEdit, setAutoOpenedEdit] = useState(false);
  const [editOrderContact, setEditOrderContact] = useState<{
    contactId: string | null;
    customerName: string;
    customerPhone: string | null;
  }>({ contactId: null, customerName: "", customerPhone: null });

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
      const raw = await getServiceCreateMeta();
      return SuperJSON.deserialize<{
        session: { id: string };
        products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
        contacts: Array<{ id: string; name: string }>;
      }>(raw);
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
  const servicePaymentMethodsQuery = useQuery({
    queryKey: ["services-payment-methods"],
    queryFn: async () => {
      const raw = await getServicePaymentMethods();
      return SuperJSON.deserialize<Array<{
        id: string;
        name: string;
        method: "CASH" | "BANK";
        accountType: "CASH" | "PETTY_CASH" | "BANK" | "EWALLET";
        bankName: string | null;
        accountNumber: string | null;
      }>>(raw);
    },
  });
  const settleMethodOptions = useMemo(
    () => (servicePaymentMethodsQuery.data || []).filter((item) => item.method === settlePaymentMethod),
    [servicePaymentMethodsQuery.data, settlePaymentMethod],
  );

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

  const openWhatsApp = async (order: ServiceOrderListItem) => {
    if (!order.contactId) {
      toast({ title: "Order ini belum memiliki customer", variant: "destructive" });
      return;
    }
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
    const trackingLink = await createPublicTrackingLink({
      baseUrl: origin,
      locale,
      sourceType: "SERVICE_ORDER",
      sourceId: order.id,
      contactId: order.contactId || null,
    });
    const invoiceUrl = trackingLink.url;
    const invoiceNumber = order.invoiceNumber || "-";
    const noInvoice = order.salesInvoiceId ? "" : "Belum ada invoice";

    const eventKey =
      order.status === "NEW"
        ? "SERVICE_CREATED"
        : order.status === "READY"
          ? "SERVICE_READY"
          : order.status === "DONE"
            ? "SERVICE_COST_DONE"
            : "SERVICE_PICKED_UP";
    const preview = await buildCompanyCommunicationPreview({
      eventKey,
      vars: {
        customer_name: order.customerName,
        order_number: order.orderNumber,
        doc_number: order.orderNumber,
        status: order.status,
        invoice_number: invoiceNumber,
        invoice_url: invoiceUrl,
        public_tracking_url: invoiceUrl,
        public_service_url: invoiceUrl,
        no_invoice: noInvoice || "-",
        warranty_text: warrantyText,
        doc_url: invoiceUrl,
        total_amount: Number(order.totalAmount || 0).toLocaleString("id-ID"),
        amount: Number(order.totalAmount || 0).toLocaleString("id-ID"),
        remaining_amount: Number(order.remainingAmount || 0).toLocaleString("id-ID"),
        target_date: order.targetDate ? formatDate(order.targetDate) : "-",
        date: formatDate(order.createdAt),
      },
    });
    if (!preview.isEnabled) {
      toast({ title: "Template notifikasi event ini sedang nonaktif", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(preview.message)}`, "_blank", "noopener,noreferrer");
  };

  const openServiceNotification = async (input: {
    eventKey: "SERVICE_CREATED" | "SERVICE_READY" | "SERVICE_COST_DONE" | "SERVICE_PICKED_UP" | "SALES_PAYMENT_POSTED";
    eventType: "SERVICE_CREATED" | "SERVICE_STATUS_UPDATED" | "SERVICE_PAYMENT_RECEIVED";
    sourceId: string;
    contactId: string | null;
    customerName: string;
    customerPhone: string | null;
    orderNumber: string;
    invoiceNumber?: string | null;
    totalAmount: number;
    remainingAmount: number;
    createdAt?: Date;
    targetDate?: Date | null;
  }) => {
    if (!input.contactId) return;
    const normalized = normalizePhoneForWhatsApp(input.customerPhone);
    if (!normalized) return;

    const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
    const origin = window.location.origin;
    const trackingLink = await createPublicTrackingLink({
      baseUrl: origin,
      locale,
      sourceType: "SERVICE_ORDER",
      sourceId: input.sourceId,
      contactId: input.contactId,
    });
    const invoiceUrl = trackingLink.url;

    const preview = await buildCompanyCommunicationPreview({
      eventKey: input.eventKey,
      vars: {
        customer_name: input.customerName,
        doc_number: input.orderNumber,
        amount: Number(input.totalAmount || 0).toLocaleString("id-ID"),
        remaining_amount: Number(input.remainingAmount || 0).toLocaleString("id-ID"),
        status: "-",
        date: formatDate(input.createdAt || new Date()),
        warranty_text: "-",
        doc_url: invoiceUrl,
        public_tracking_url: invoiceUrl,
        public_service_url: invoiceUrl,
      },
    });
    if (!preview.isEnabled) return;

    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(preview.message)}`, "_blank", "noopener,noreferrer");
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
      const defaultAccountId = settleCashAccountId || settleMethodOptions[0]?.id;
      if (!defaultAccountId) throw new Error("Akun Cash/Bank belum tersedia");
      await settleServiceOrder(order.id, defaultAccountId, Number(order.remainingAmount), settlePaymentMethod);
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["services-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
      toast({ title: "Pembayaran service berhasil dicatat" });
      await openServiceNotification({
        eventKey: "SALES_PAYMENT_POSTED",
        eventType: "SERVICE_PAYMENT_RECEIVED",
        sourceId: order.id,
        contactId: order.contactId || null,
        customerName: order.customerName,
        customerPhone: order.customerPhone || null,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber || null,
        totalAmount: Number(order.totalAmount || 0),
        remainingAmount: 0,
        createdAt: new Date(),
        targetDate: order.targetDate,
      });
    } catch (error) {
      toast({ title: "Gagal mencatat pembayaran", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const onSettleFromInvoice = async (invoice: ServiceInvoiceListItem) => {
    setPendingActionId(invoice.serviceOrderId);
    try {
      const defaultAccountId = settleCashAccountId || settleMethodOptions[0]?.id;
      if (!defaultAccountId) throw new Error("Akun Cash/Bank belum tersedia");
      const remaining = Number(invoice.balanceDue);
      if (remaining <= 0) throw new Error("Invoice ini tidak memiliki sisa tagihan");
      await settleServiceOrder(
        invoice.serviceOrderId,
        defaultAccountId,
        remaining,
        settlePaymentMethod,
      );
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["services-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
      toast({ title: "Pembayaran service berhasil dicatat" });
      const paymentOrder = (ordersQuery.data?.rows || []).find((row) => row.id === invoice.serviceOrderId);
      await openServiceNotification({
        eventKey: "SALES_PAYMENT_POSTED",
        eventType: "SERVICE_PAYMENT_RECEIVED",
        sourceId: invoice.serviceOrderId,
        contactId: paymentOrder?.contactId || null,
        customerName: paymentOrder?.customerName || invoice.customerName,
        customerPhone: paymentOrder?.customerPhone || null,
        orderNumber: invoice.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number(invoice.totalAmount || 0),
        remainingAmount: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      toast({
        title: "Gagal mencatat pembayaran",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const openEditOrder = useCallback(async (orderId: string, fallbackRemainingAmount?: number) => {
    setEditOrderId(orderId);
    setPendingActionId(orderId);
    try {
      const raw = await getServiceOrderForEdit(orderId);
      const detail = SuperJSON.deserialize<{
        id: string;
        orderNumber: string;
        contactId: string | null;
        customerName: string;
        customerPhone: string | null;
        status: ServiceOrderStatus;
        notes: string;
        salesOrderId: string | null;
        salesOrderNumber: string | null;
        salesInvoiceId: string | null;
        invoiceNumber: string | null;
        subtotal: number;
        totalAmount: number;
        dpAmount: number;
        paidAmount: number;
        remainingAmount: number;
        latestPayment: {
          id: string;
          paymentNumber: string;
          paymentDate: Date;
          method: string;
          amount: number;
        } | null;
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
      setEditOrderMeta({
        orderNumber: detail.orderNumber,
        salesOrderId: detail.salesOrderId,
        salesOrderNumber: detail.salesOrderNumber,
        salesInvoiceId: detail.salesInvoiceId,
        invoiceNumber: detail.invoiceNumber,
        subtotal: detail.subtotal,
        totalAmount: detail.totalAmount,
        dpAmount: detail.dpAmount,
        paidAmount: detail.paidAmount,
        remainingAmount: detail.remainingAmount,
        latestPayment: detail.latestPayment,
      });
      setEditOrderContact({
        contactId: detail.contactId,
        customerName: detail.customerName,
        customerPhone: detail.customerPhone,
      });
      setSettleAmount(detail.remainingAmount || fallbackRemainingAmount || 0);
      if (!settleCashAccountId && settleMethodOptions.length) {
        setSettleCashAccountId(settleMethodOptions[0].id);
      }
      setEditInitialSnapshot(JSON.stringify({
        status: detail.status,
        notes: detail.notes || "",
        items: detail.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || "",
        })),
      }));
      setEditOrderOpen(true);
    } catch (error) {
      toast({ title: "Gagal load detail order", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  }, [settleCashAccountId, settleMethodOptions, toast]);

  const onSaveOrderEdit = async () => {
    if (!editOrderId) return;
    for (const item of editItems) {
      if (!item.productId || item.quantity <= 0 || item.unitPrice <= 0 || !item.notes.trim()) {
        toast({
          title: "Produk, qty, harga, dan catatan tiap baris wajib diisi",
          variant: "destructive",
        });
        return;
      }
    }
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
      if (editStatusValue !== editStatusOptions[0]) {
        const statusEventKey =
          editStatusValue === "READY"
            ? "SERVICE_READY"
            : editStatusValue === "DONE"
              ? "SERVICE_COST_DONE"
              : editStatusValue === "CLOSED"
                ? "SERVICE_PICKED_UP"
                : null;
        if (statusEventKey) {
          await openServiceNotification({
            eventKey: statusEventKey,
            eventType: "SERVICE_STATUS_UPDATED",
            sourceId: editOrderId,
            contactId: editOrderContact.contactId,
            customerName: editOrderContact.customerName,
            customerPhone: editOrderContact.customerPhone,
            orderNumber: editOrderMeta?.orderNumber || "-",
            invoiceNumber: editOrderMeta?.invoiceNumber || null,
            totalAmount: editOrderMeta?.totalAmount || 0,
            remainingAmount: editOrderMeta?.remainingAmount || 0,
            createdAt: new Date(),
          });
        }
      }
      setEditInitialSnapshot("");
      setEditOrderOpen(false);
    } catch (error) {
      toast({ title: "Gagal update service order", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  const hasEditChanges =
    editOrderOpen &&
    editInitialSnapshot.length > 0 &&
    editInitialSnapshot !==
      JSON.stringify({
        status: editStatusValue,
        notes: editNotesValue || "",
        items: editItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || "",
        })),
      });

  const closeEditDialog = (force = false) => {
    if (!force && hasEditChanges) {
      const confirmed = window.confirm("Perubahan belum disimpan. Tutup popup dan buang perubahan?");
      if (!confirmed) return;
    }
    setEditOrderOpen(false);
    setEditInitialSnapshot("");
  };

  const onSettleFromEdit = async () => {
    if (!editOrderId || !editOrderMeta || editOrderMeta.remainingAmount <= 0) return;
    setPendingActionId(editOrderId);
    try {
      const selectedAccountId = settleCashAccountId || settleMethodOptions[0]?.id;
      if (!selectedAccountId) throw new Error("Pilih akun Cash/Bank terlebih dahulu");
      await settleServiceOrder(
        editOrderId,
        selectedAccountId,
        settleAmount > 0 ? settleAmount : editOrderMeta.remainingAmount,
        settlePaymentMethod,
      );
      await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["services-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
      const raw = await getServiceOrderForEdit(editOrderId);
      const refreshed = SuperJSON.deserialize<{
        orderNumber: string;
        contactId: string | null;
        customerName: string;
        customerPhone: string | null;
        invoiceNumber: string | null;
        paidAmount: number;
        remainingAmount: number;
        latestPayment: {
          id: string;
          paymentNumber: string;
          paymentDate: Date;
          method: string;
          amount: number;
        } | null;
      }>(raw);
      setEditOrderMeta((prev) =>
        prev
          ? {
              ...prev,
              paidAmount: refreshed.paidAmount,
              remainingAmount: refreshed.remainingAmount,
              latestPayment: refreshed.latestPayment,
            }
          : prev,
      );
      setSettleAmount(refreshed.remainingAmount);
      setEditOrderContact({
        contactId: refreshed.contactId,
        customerName: refreshed.customerName,
        customerPhone: refreshed.customerPhone,
      });
      toast({ title: "Pembayaran service berhasil dicatat" });
      await openServiceNotification({
        eventKey: "SALES_PAYMENT_POSTED",
        eventType: "SERVICE_PAYMENT_RECEIVED",
        sourceId: editOrderId,
        contactId: refreshed.contactId,
        customerName: refreshed.customerName,
        customerPhone: refreshed.customerPhone,
        orderNumber: refreshed.orderNumber,
        invoiceNumber: refreshed.invoiceNumber,
        totalAmount: refreshed.paidAmount,
        remainingAmount: refreshed.remainingAmount,
        createdAt: new Date(),
      });
    } catch (error) {
      toast({ title: "Gagal mencatat pembayaran", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setPendingActionId(null);
    }
  };

  useEffect(() => {
    if (!settleMethodOptions.length) {
       
      setSettleCashAccountId("");
      return;
    }
    const selectedStillExists = settleMethodOptions.some((item) => item.id === settleCashAccountId);
    if (!selectedStillExists) {
      setSettleCashAccountId(settleMethodOptions[0].id);
    }
  }, [settleMethodOptions, settleCashAccountId]);

  useEffect(() => {
    if (!editOrderOpen || !hasEditChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]");
      if (!link) return;
      const confirmed = window.confirm("Perubahan belum disimpan. Tetap pindah halaman?");
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [editOrderOpen, hasEditChanges]);

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

  useEffect(() => {
    if (!initialEditOrderId || autoOpenedEdit) return;
    if (tab !== "orders") return;
    const rows = ordersQuery.data?.rows || [];
    const matched = rows.find((row) => row.id === initialEditOrderId);
    if (!matched) return;
     
    setAutoOpenedEdit(true);
    void openEditOrder(matched.id, Number(matched.remainingAmount || 0));
  }, [initialEditOrderId, autoOpenedEdit, tab, ordersQuery.data?.rows, openEditOrder]);

  const orderColumns: Column<ServiceOrderListItem>[] = [
    {
      header: "Order #",
      className: "font-medium",
      cell: (item) => (
        <Link href={`/services/orders/${item.id}`} className="text-primary hover:underline">
          {item.orderNumber}
        </Link>
      ),
    },
    { header: "Tanggal", cell: (item) => formatDate(item.createdAt) },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Produk", cell: (item) => item.primaryProductName || "-" },
    { header: "Catatan", cell: (item) => item.primaryItemNotes || "-" },
    {
      header: "Harga",
      className: "text-right",
      headerClassName: "text-right",
      cell: (item) =>
        item.primaryItemPrice ? formatCurrency(Number(item.primaryItemPrice)) : "-",
    },
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
            <DropdownMenuItem asChild>
              <Link href={`/services/pipeline/${item.id}`}>Open in Pipeline</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditOrder(item.id, Number(item.remainingAmount || 0))}>Edit</DropdownMenuItem>
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
      className: "w-[120px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={pendingActionId === item.serviceOrderId}>
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
              <DropdownMenuItem onClick={() => onSettleFromInvoice(item)}>
                Settle Payment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openPrint("SERVICE_INVOICE", { invoiceId: item.id }, `Print ${item.invoiceNumber}`)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Buat Service Order</DialogTitle>
                  </DialogHeader>
                  {createMetaQuery.data?.session?.id ? (
                    <ServiceOrderCreateForm
                      compact
                      products={createMetaQuery.data.products}
                      contacts={createMetaQuery.data.contacts}
                      paymentMethodOptions={servicePaymentMethodsQuery.data || []}
                      createOrderAction={createServiceOrder}
                      createQuickContactAction={createServiceQuickContact}
                      onSuccess={async () => {
                        setCreateOpen(false);
                        await queryClient.invalidateQueries({ queryKey: ["services-orders"] });
                        await queryClient.invalidateQueries({ queryKey: ["services-invoices"] });
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Gagal memuat data pembuatan service order.</p>
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
      <Dialog
        open={editOrderOpen}
        onOpenChange={(open) => {
          if (open) {
            setEditOrderOpen(true);
            return;
          }
          closeEditDialog();
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="text-xs text-muted-foreground">
              <Link href="/services/orders" className="hover:underline">
                Service Orders
              </Link>
              <span className="mx-1">/</span>
              <span>{editOrderMeta?.orderNumber || "Detail"}</span>
            </div>
            <DialogTitle>Edit Service Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {editOrderMeta ? (
              <div className="grid gap-2 rounded-md border p-3">
                <div className="text-sm font-medium">Ringkasan Order</div>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">Order</div>
                    <div>{editOrderMeta.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Invoice</div>
                    <div>{editOrderMeta.invoiceNumber || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">DP</div>
                    <div>{formatCurrency(editOrderMeta.dpAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sisa Bayar</div>
                    <div>{formatCurrency(editOrderMeta.remainingAmount)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div>{formatCurrency(editOrderMeta.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sudah Dibayar</div>
                    <div>{formatCurrency(editOrderMeta.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Payment</div>
                    <div>{editOrderMeta.latestPayment?.paymentNumber || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tgl Bayar</div>
                    <div>{editOrderMeta.latestPayment?.paymentDate ? formatDate(editOrderMeta.latestPayment.paymentDate) : "-"}</div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 rounded-md border p-3">
              <div className="text-sm font-medium">Quick Actions</div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[160px]">
                  <Label>Method</Label>
                  <Select
                    value={settlePaymentMethod}
                    onValueChange={(value) => setSettlePaymentMethod(value as "CASH" | "BANK")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[280px]">
                  <Label>Cash/Bank Account</Label>
                  <Select value={settleCashAccountId} onValueChange={setSettleCashAccountId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {settleMethodOptions.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          [{account.method}] {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Label>Amount</Label>
                  <Input type="number" min={0} value={settleAmount} onChange={(event) => setSettleAmount(Number(event.target.value) || 0)} />
                </div>
                <Button
                  variant="default"
                  onClick={onSettleFromEdit}
                  disabled={!editOrderMeta || editOrderMeta.remainingAmount <= 0 || pendingActionId === editOrderId}
                >
                  Bayar
                </Button>
                {editOrderMeta?.salesOrderId ? (
                  <Button
                    variant="outline"
                    onClick={() => openPrint("SERVICE_WORK_ORDER", { orderId: editOrderMeta.salesOrderId as string }, `Print ${editOrderMeta.orderNumber}`)}
                  >
                    Print Order
                  </Button>
                ) : null}
                {editOrderMeta?.salesInvoiceId ? (
                  <Button
                    variant="outline"
                    onClick={() => openPrint("SERVICE_INVOICE", { invoiceId: editOrderMeta.salesInvoiceId as string }, `Print ${editOrderMeta.invoiceNumber || editOrderMeta.orderNumber}`)}
                  >
                    Print Invoice
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2 rounded-md border border-indigo-200 bg-indigo-50/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <CircleDashed className="h-4 w-4" /> Status Workflow
              </div>
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
            <div className="grid gap-2 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Wrench className="h-4 w-4" /> Item Service
              </div>
              <div className="flex items-center justify-between">
                <Label>Ordered Items</Label>
                <Button type="button" variant="outline" onClick={addEditItem}>Tambah Item</Button>
              </div>
              <TableOverflow className="max-w-[calc(100vw-2rem)]" minWidthClassName="min-w-[760px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-white/80">
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[110px]">Quantity</TableHead>
                    <TableHead className="w-[220px]">Price</TableHead>
                    <TableHead className="w-[56px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editItems.length === 0 ? (
                    <TableRow className="bg-emerald-50/50">
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
                            placeholder="Catatan item (wajib)"
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
              </TableOverflow>
            </div>
            <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <NotebookPen className="h-4 w-4" /> Catatan
              </div>
              <Label>Catatan</Label>
              <Textarea className="bg-white" value={editNotesValue} onChange={(event) => setEditNotesValue(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeEditDialog()}>Batal</Button>
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
