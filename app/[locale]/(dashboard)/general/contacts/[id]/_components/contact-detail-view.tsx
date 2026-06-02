"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Contact, ContactType } from "@/prisma/generated/prisma/browser";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";

import {
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import { useToast } from "@/hooks/use-toast";
import {
  createContactCommunicationLog,
  getContactMessageTemplates,
  updateContactCommunicationLogStatus,
  upsertContactMessageTemplate,
} from "@/app/[locale]/communications/actions";

type MessagingItem = { name: string; quantity: number };

type ContactTransactionHistoryItem = {
  id: string;
  area: string;
  type: string;
  documentNumber: string;
  status: string;
  amount: number | null;
  balanceDue: number | null;
  happenedAt: Date;
  detail: string;
  href: string | null;
};

type ContactDashboardSummary = {
  totalTransactions: number;
  totalSalesInvoiced: number;
  totalSalesPaid: number;
  outstandingBalance: number;
  lastTransactionAt: Date | null;
};

type TransactionAreaFilter = "ALL" | "Sales" | "Service" | "Cash" | "Purchase";

type ContactMessagingContext = {
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    type: string;
  };
  summary: ContactDashboardSummary;
  transactionHistory: ContactTransactionHistoryItem[];
  latestInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    invoiceDate: Date;
    totalAmount: number;
    balanceDue: number;
    items: MessagingItem[];
  } | null;
  latestSalesOrder: {
    id: string;
    orderNumber: string;
    status: string;
    orderDate: Date;
    items: MessagingItem[];
  } | null;
  latestServiceOrder: {
    id: string;
    orderNumber: string;
    status: string;
    targetDate: Date | null;
    items: MessagingItem[];
  } | null;
  recentWhatsAppLogs: Array<{
    id: string;
    channel: string;
    eventType: string;
    status: string;
    sourceType: string | null;
    sourceId: string | null;
    target: string | null;
    message: string;
    providerMessageId: string | null;
    documentLinks: Array<{ label: string; url: string }>;
    queuedAt: Date | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
} | null;

interface ContactDetailViewProps {
  contact: Contact;
  messagingContext: ContactMessagingContext;
}

type TemplateKind = "PROMO" | "SERVICE_UPDATE" | "PAYMENT_REMINDER";

const DEFAULT_TEMPLATES: Record<TemplateKind, string> = {
  PROMO:
    "Halo {{contact_name}}, kami punya promo terbaru untuk {{latest_product_items}}. Cek detailnya di sini: {{sales_order_pdf_url}}",
  SERVICE_UPDATE:
    "Halo {{contact_name}}, update service {{latest_service_order}}: status {{latest_service_status}}. Item: {{latest_service_items}}. Target selesai: {{latest_service_target_date}}.",
  PAYMENT_REMINDER:
    "Halo {{contact_name}}, kami mengingatkan nota {{latest_invoice_number}} dengan total {{latest_invoice_total}} dan sisa {{latest_invoice_balance}}. Invoice: {{invoice_pdf_url}} | Nota POS: {{receipt_pdf_url}}",
};

const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  PROMO: "Promo",
  SERVICE_UPDATE: "Update Service",
  PAYMENT_REMINDER: "Reminder Pembayaran",
};

function normalizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function buildItemSummary(items: MessagingItem[]): string {
  if (!items.length) return "-";
  return items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case ContactType.CUSTOMER:
      return "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900 dark:text-blue-300 border-transparent";
    case ContactType.VENDOR:
      return "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900 dark:text-orange-300 border-transparent";
    case ContactType.EMPLOYEE:
      return "bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900 dark:text-purple-300 border-transparent";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300 border-transparent";
  }
}

function getStatusBadgeVariant(status: string) {
  if (["PAID", "READ", "DELIVERED", "CLOSED", "APPROVED"].includes(status)) {
    return "default" as const;
  }
  if (["ISSUED", "CONFIRMED", "PROCESSING", "QUEUED", "PARTIALLY_PAID", "BILLED", "SENT"].includes(status)) {
    return "secondary" as const;
  }
  if (["FAILED", "CANCELLED", "CANCELED", "REJECTED"].includes(status)) {
    return "destructive" as const;
  }
  return "outline" as const;
}

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function ContactDetailView({
  contact,
  messagingContext,
}: ContactDetailViewProps) {
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const t = useTranslations("General.Contacts");
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const locale = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[0] || "id";
  }, [pathname]);

  const [templateKind, setTemplateKind] = useState<TemplateKind>("PROMO");
  const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATES.PROMO);
  const [templateMap, setTemplateMap] =
    useState<Record<TemplateKind, string>>(DEFAULT_TEMPLATES);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [transactionAreaFilter, setTransactionAreaFilter] =
    useState<TransactionAreaFilter>("ALL");

  useEffect(() => {
    let active = true;
    const loadTemplates = async () => {
      setTemplateLoading(true);
      try {
        const rows = await getContactMessageTemplates(contact.id);
        if (!active) return;
        const nextMap: Record<TemplateKind, string> = { ...DEFAULT_TEMPLATES };
        rows.forEach((row) => {
          if (row.kind in nextMap) {
            nextMap[row.kind as TemplateKind] = row.template;
          }
        });
        setTemplateMap(nextMap);
        setTemplateText(nextMap[templateKind]);
      } catch {
        if (!active) return;
        setTemplateMap(DEFAULT_TEMPLATES);
        setTemplateText(DEFAULT_TEMPLATES[templateKind]);
      } finally {
        if (active) setTemplateLoading(false);
      }
    };

    loadTemplates();
    return () => {
      active = false;
    };
  }, [contact.id, templateKind]);

  const latestInvoice = messagingContext?.latestInvoice ?? null;
  const latestSalesOrder = messagingContext?.latestSalesOrder ?? null;
  const latestServiceOrder = messagingContext?.latestServiceOrder ?? null;
  const recentWhatsAppLogs = messagingContext?.recentWhatsAppLogs ?? [];
  const summary = messagingContext?.summary ?? {
    totalTransactions: 0,
    totalSalesInvoiced: 0,
    totalSalesPaid: 0,
    outstandingBalance: 0,
    lastTransactionAt: null,
  };
  const transactionHistory = messagingContext?.transactionHistory ?? [];
  const filteredTransactionHistory = useMemo(() => {
    if (transactionAreaFilter === "ALL") return transactionHistory;
    return transactionHistory.filter(
      (item) => item.area === transactionAreaFilter,
    );
  }, [transactionAreaFilter, transactionHistory]);

  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const salesOrderPdfUrl = latestSalesOrder
    ? `${baseOrigin}/${locale}/reporting/preview?code=SALES_ORDER&orderId=${latestSalesOrder.id}`
    : "-";
  const invoicePdfUrl = latestInvoice
    ? `${baseOrigin}/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${latestInvoice.id}`
    : "-";
  const receiptPdfUrl = latestInvoice
    ? `${baseOrigin}/${locale}/reporting/preview?code=POS_RECEIPT&invoiceId=${latestInvoice.id}`
    : "-";

  const variableMap = useMemo<Record<string, string>>(
    () => ({
      "{{contact_name}}": contact.name,
      "{{contact_phone}}": contact.phone || "-",
      "{{contact_email}}": contact.email || "-",
      "{{latest_service_order}}": latestServiceOrder?.orderNumber || "-",
      "{{latest_service_status}}": latestServiceOrder?.status || "-",
      "{{latest_service_items}}": latestServiceOrder
        ? buildItemSummary(latestServiceOrder.items)
        : "-",
      "{{latest_service_target_date}}": latestServiceOrder?.targetDate
        ? formatDate(latestServiceOrder.targetDate)
        : "-",
      "{{latest_invoice_number}}": latestInvoice?.invoiceNumber || "-",
      "{{latest_invoice_total}}": latestInvoice
        ? formatCurrency(latestInvoice.totalAmount)
        : "-",
      "{{latest_invoice_balance}}": latestInvoice
        ? formatCurrency(latestInvoice.balanceDue)
        : "-",
      "{{latest_product_items}}": latestSalesOrder
        ? buildItemSummary(latestSalesOrder.items)
        : latestInvoice
          ? buildItemSummary(latestInvoice.items)
          : "-",
      "{{sales_order_pdf_url}}": salesOrderPdfUrl,
      "{{invoice_pdf_url}}": invoicePdfUrl,
      "{{receipt_pdf_url}}": receiptPdfUrl,
    }),
    [
      contact.email,
      contact.name,
      contact.phone,
      formatCurrency,
      formatDate,
      invoicePdfUrl,
      latestInvoice,
      latestSalesOrder,
      latestServiceOrder,
      receiptPdfUrl,
      salesOrderPdfUrl,
    ],
  );

  const renderedMessage = useMemo(() => {
    let output = templateText;
    Object.entries(variableMap).forEach(([token, value]) => {
      output = output.split(token).join(value);
    });
    return output;
  }, [templateText, variableMap]);

  const waUrl = useMemo(() => {
    const phone = normalizePhoneForWhatsApp(contact.phone);
    if (!phone) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(renderedMessage)}`;
  }, [contact.phone, renderedMessage]);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(renderedMessage);
    toast({ title: "Template pesan berhasil disalin" });
  };

  const persistTemplate = async () => {
    const trimmed = templateText.trim();
    if (!trimmed) {
      toast({
        title: "Template kosong",
        description: "Isi template dulu sebelum disimpan.",
        variant: "destructive",
      });
      return false;
    }

    setTemplateSaving(true);
    try {
      await upsertContactMessageTemplate({
        contactId: contact.id,
        kind: templateKind,
        template: trimmed,
      });
      setTemplateMap((prev) => ({ ...prev, [templateKind]: trimmed }));
      toast({ title: "Template tersimpan ke database" });
      return true;
    } catch (error) {
      toast({
        title: "Gagal menyimpan template",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    } finally {
      setTemplateSaving(false);
    }
  };

  const openWhatsApp = async () => {
    const templateSaved = await persistTemplate();
    if (!templateSaved) return;

    const logBase = {
      contactId: contact.id,
      eventType: "CONTACT_TEMPLATE" as const,
      sourceType: "CONTACT",
      sourceId: contact.id,
      target: contact.phone || undefined,
      message: renderedMessage,
      documentLinks: [
        { label: "Sales Order PDF", url: salesOrderPdfUrl },
        { label: "Invoice PDF", url: invoicePdfUrl },
        { label: "POS Receipt", url: receiptPdfUrl },
      ].filter((item) => item.url !== "-"),
    };

    if (!waUrl) {
      await createContactCommunicationLog({
        ...logBase,
        status: "FAILED",
        errorMessage: "Nomor WA tidak tersedia/invalid",
      });
      toast({
        title: "Nomor WA tidak tersedia",
        description: "Isi nomor telepon contact agar bisa kirim WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const created = await createContactCommunicationLog({
      ...logBase,
      status: "QUEUED",
    });
    const popup = window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      await updateContactCommunicationLogStatus({
        id: created.id,
        status: "FAILED",
        errorMessage: "Popup WA diblok browser",
      });
      toast({
        title: "Popup WhatsApp diblok browser",
        description: "Izinkan popup lalu coba kirim ulang.",
        variant: "destructive",
      });
      router.refresh();
      return;
    }

    await updateContactCommunicationLogStatus({
      id: created.id,
      status: "SENT",
    });
    router.refresh();
  };

  const markLogStatus = async (
    id: string,
    status: "DELIVERED" | "READ" | "FAILED" | "SENT",
  ) => {
    setStatusUpdatingId(id);
    try {
      await updateContactCommunicationLogStatus({ id, status });
      router.refresh();
      toast({ title: `Status log diubah ke ${status}` });
    } catch (error) {
      toast({
        title: "Gagal update status log",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const appendToken = (token: string) => {
    setTemplateText((prev) =>
      `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${token}`,
    );
  };

  return (
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle>
          <div className="flex flex-wrap items-center gap-4">
            <span>{contact.name}</span>
            <div className="flex items-center gap-2">
              <Badge className={getTypeBadgeColor(contact.type)} variant="outline">
                {contact.type}
              </Badge>
              <Badge variant={contact.isActive ? "default" : "secondary"}>
                {contact.isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
          </div>
        </PageFormTitle>
      </PageFormHeader>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Transaksi"
              value={summary.totalTransactions.toString()}
              hint="Jumlah dokumen transaksi terkait contact"
            />
            <SummaryCard
              title="Total Invoice Sales"
              value={formatCurrency(summary.totalSalesInvoiced)}
              hint="Akumulasi nilai invoice sales"
            />
            <SummaryCard
              title="Total Pembayaran Sales"
              value={formatCurrency(summary.totalSalesPaid)}
              hint="Akumulasi pembayaran customer"
            />
            <SummaryCard
              title="Outstanding"
              value={formatCurrency(summary.outstandingBalance)}
              hint={
                summary.lastTransactionAt
                  ? `Aktivitas terakhir ${formatDate(summary.lastTransactionAt, {
                      includeTime: true,
                    })}`
                  : "Belum ada aktivitas transaksi"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("contact_info")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("email")}:</span>
                  <span className="text-sm">{contact.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("phone")}:</span>
                  <span className="text-sm">{contact.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("address")}:</span>
                  <span className="text-sm">{contact.address || "-"}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("created_at")}</span>
                  <span className="text-sm">
                    {formatDate(contact.createdAt, { includeTime: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("updated_at")}</span>
                  <span className="text-sm">
                    {formatDate(contact.updatedAt, { includeTime: true })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Sales Order Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{latestSalesOrder?.orderNumber || "-"}</p>
                <p className="text-muted-foreground">
                  {latestSalesOrder
                    ? `${latestSalesOrder.status} • ${formatDate(latestSalesOrder.orderDate, {
                        includeTime: true,
                      })}`
                    : "Belum ada sales order"}
                </p>
                <p className="text-muted-foreground">
                  {latestSalesOrder?.items?.length
                    ? buildItemSummary(latestSalesOrder.items)
                    : "-"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Invoice Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{latestInvoice?.invoiceNumber || "-"}</p>
                <p className="text-muted-foreground">
                  {latestInvoice
                    ? `${latestInvoice.status} • ${formatDate(latestInvoice.invoiceDate, {
                        includeTime: true,
                      })}`
                    : "Belum ada invoice"}
                </p>
                <p className="text-muted-foreground">
                  {latestInvoice
                    ? `Total ${formatCurrency(latestInvoice.totalAmount)} • Sisa ${formatCurrency(latestInvoice.balanceDue)}`
                    : "-"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Service Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{latestServiceOrder?.orderNumber || "-"}</p>
                <p className="text-muted-foreground">
                  {latestServiceOrder
                    ? `${latestServiceOrder.status} • ${
                        latestServiceOrder.targetDate
                          ? formatDate(latestServiceOrder.targetDate)
                          : "Tanpa target"
                      }`
                    : "Belum ada service order"}
                </p>
                <p className="text-muted-foreground">
                  {latestServiceOrder?.items?.length
                    ? buildItemSummary(latestServiceOrder.items)
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Histori Transaksi Customer</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["ALL", "Sales", "Service", "Cash", "Purchase"] as TransactionAreaFilter[]
                  ).map((filter) => (
                    <Button
                      key={filter}
                      type="button"
                      size="sm"
                      variant={
                        transactionAreaFilter === filter ? "default" : "outline"
                      }
                      onClick={() => setTransactionAreaFilter(filter)}
                    >
                      {filter === "ALL" ? "All" : filter}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTransactionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {transactionHistory.length === 0
                    ? "Belum ada transaksi terkait contact ini."
                    : "Tidak ada transaksi untuk filter yang dipilih."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Dokumen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactionHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {formatDate(item.happenedAt, { includeTime: true })}
                        </TableCell>
                        <TableCell>{item.area}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>
                          {item.href ? (
                            <a
                              href={`/${locale}${item.href}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {item.documentNumber}
                            </a>
                          ) : (
                            <span className="font-medium">{item.documentNumber}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.amount === null ? "-" : formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.balanceDue === null
                            ? "-"
                            : formatCurrency(item.balanceDue)}
                        </TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal text-muted-foreground">
                          {item.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                WhatsApp Template & Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Jenis Template</p>
                <Select
                  value={templateKind}
                  onValueChange={(value) => {
                    const nextKind = value as TemplateKind;
                    setTemplateKind(nextKind);
                    setTemplateText(
                      templateMap[nextKind] || DEFAULT_TEMPLATES[nextKind],
                    );
                  }}
                >
                  <SelectTrigger className="w-full md:w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Template Custom</p>
                <Textarea
                  rows={7}
                  value={templateText}
                  onChange={(event) => setTemplateText(event.target.value)}
                  placeholder="Tulis template pesan custom di sini"
                  disabled={templateLoading || templateSaving}
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    "{{contact_name}}",
                    "{{latest_service_order}}",
                    "{{latest_service_items}}",
                    "{{latest_product_items}}",
                    "{{latest_invoice_number}}",
                    "{{latest_invoice_total}}",
                    "{{latest_invoice_balance}}",
                    "{{invoice_pdf_url}}",
                    "{{receipt_pdf_url}}",
                  ].map((token) => (
                    <Button
                      key={token}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendToken(token)}
                    >
                      {token}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Preview Pesan</p>
                <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                  {renderedMessage}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={openWhatsApp}
                  disabled={templateLoading || templateSaving}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Kirim WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={persistTemplate}
                  disabled={templateLoading || templateSaving}
                >
                  {templateSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Simpan Template (DB)
                </Button>
                <Button type="button" variant="outline" onClick={copyMessage}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Pesan
                </Button>
                {latestInvoice ? (
                  <Button type="button" variant="outline" asChild>
                    <a
                      href={`/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${latestInvoice.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Buka PDF Invoice
                    </a>
                  </Button>
                ) : null}
                {latestInvoice ? (
                  <Button type="button" variant="outline" asChild>
                    <a
                      href={`/${locale}/reporting/preview?code=POS_RECEIPT&invoiceId=${latestInvoice.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Buka Nota POS
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat WA Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWhatsAppLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada log WhatsApp.
                </p>
              ) : null}

              {recentWhatsAppLogs.map((log) => (
                <div key={log.id} className="rounded-md border p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{log.eventType}</Badge>
                    <Badge variant={getStatusBadgeVariant(log.status)}>
                      {log.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDate(log.createdAt, { includeTime: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{log.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {log.status === "QUEUED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === log.id}
                        onClick={() => markLogStatus(log.id, "SENT")}
                      >
                        {statusUpdatingId === log.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Mark Sent
                      </Button>
                    ) : null}
                    {log.status === "SENT" || log.status === "QUEUED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === log.id}
                        onClick={() => markLogStatus(log.id, "DELIVERED")}
                      >
                        {statusUpdatingId === log.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Mark Delivered
                      </Button>
                    ) : null}
                    {log.status !== "READ" && log.status !== "FAILED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === log.id}
                        onClick={() => markLogStatus(log.id, "READ")}
                      >
                        {statusUpdatingId === log.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Mark Read
                      </Button>
                    ) : null}
                    {log.status !== "FAILED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === log.id}
                        onClick={() => markLogStatus(log.id, "FAILED")}
                      >
                        {statusUpdatingId === log.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Mark Failed
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageFormLayout>
  );
}
