"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2, Trash2, PlusIcon, CalendarIcon } from "lucide-react";
import {
  createSalesInvoice,
  updateSalesInvoice,
  getSalesOrder,
  postSalesInvoice,
  cancelSalesInvoice,
} from "../actions";
import { TaxRate } from "@/prisma/generated/prisma/client";
import { SalesInvoiceWithDetails, SalesInvoiceInput } from "../types";
import { SalesOrderWithDetails } from "../../orders/types";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { format, parse, isValid } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { generateId } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { useToast } from "@/hooks/use-toast";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { Paperclip, PrinterIcon } from "lucide-react";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { useCompanyProfile } from "@/components/providers/session-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { buildCompanyCommunicationPreview, createContactCommunicationLog, createPublicTrackingLink } from "@/app/[locale]/communications/actions";
import {
  normalizePhoneForWhatsApp,
} from "@/lib/communication/company-communication";
import { WhatsAppNotificationDialog } from "@/components/communication/whatsapp-notification-dialog";
import { TableOverflow } from "@/components/ui/table-overflow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductWithDetails } from "@/app/[locale]/(dashboard)/inventory/types";

interface SalesInvoiceFormProps {
  invoice?: SuperJSONResult | null;
  customers: { id: string; name: string; phone?: string | null; address?: string | null }[];
  salesOrders: SuperJSONResult;
  products: SuperJSONResult | ProductWithDetails[];
  taxRates: TaxRate[];
  departments?: Department[];
  projects?: Project[];
  readonly?: boolean;
  initialSalesOrderId?: string;
}

export function buildSalesInvoiceDraftSavedDescription({
  invoiceNumber,
  customerName,
}: {
  invoiceNumber?: string | null;
  customerName?: string | null;
}) {
  const invoiceLabel = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice";
  const customerLine = customerName ? ` untuk ${customerName}` : "";

  return [
    `${invoiceLabel}${customerLine} berhasil dibuat sebagai Draft.`,
    "Silakan edit dan periksa lagi data invoice sebelum diposting.",
    "Klik Post Invoice untuk membuat invoice resmi dan jurnal transaksi.",
  ].join("\n");
}

export function SalesInvoiceForm({
  invoice: serializedInvoice,
  customers,
  salesOrders: serializedSalesOrders,
  products: serializedProducts,
  taxRates,
  departments = [],
  projects = [],
  readonly = false,
  initialSalesOrderId,
}: SalesInvoiceFormProps) {
  const invoice = serializedInvoice
    ? SuperJSON.deserialize<SalesInvoiceWithDetails>(serializedInvoice)
    : undefined;
  const salesOrders = SuperJSON.deserialize<SalesOrderWithDetails[]>(
    serializedSalesOrders,
  );
  const products = Array.isArray(serializedProducts)
    ? serializedProducts
    : SuperJSON.deserialize<ProductWithDetails[]>(serializedProducts as SuperJSONResult);

  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!invoice;
  const existingShipmentId = invoice?.salesOrder?.shipments?.[0]?.id;
  const existingPaymentId = invoice?.payments?.[0]?.id;
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();
  const alert = useAlert();
  const { toast } = useToast();
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const companyProfile = useCompanyProfile();
  const inputDateFormat = companyProfile?.dateFormat || "dd/MM/yyyy";

  const [attachments, setAttachments] = useState<Attachment[]>(
    invoice?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || []
  );
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyContext, setNotifyContext] = useState<{
    contactId: string;
    sourceId: string;
  } | null>(null);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [postActionOpen, setPostActionOpen] = useState(false);
  const hasAppliedInitialSalesOrder = useRef(false);
  const [invoiceDateInput, setInvoiceDateInput] = useState(
    invoice?.invoiceDate ? format(new Date(invoice.invoiceDate), inputDateFormat) : format(new Date(), inputDateFormat),
  );
  const [dueDateInput, setDueDateInput] = useState(
    invoice?.dueDate ? format(new Date(invoice.dueDate), inputDateFormat) : format(new Date(), inputDateFormat),
  );

  const [formData, setFormData] = useState<
    Omit<SalesInvoiceInput, "items"> & {
      items: (SalesInvoiceInput["items"][0] & { id: string })[];
    }
  >({
    invoiceNumber: invoice?.invoiceNumber || "",
    contactId: invoice?.contactId || "",
    salesOrderId: invoice?.salesOrderId || initialSalesOrderId || undefined,
    invoiceDate: invoice?.invoiceDate
      ? new Date(invoice.invoiceDate)
      : new Date(),
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
    notes: invoice?.notes || "",
    status: invoice?.status || "DRAFT",

    globalDiscount: Number(invoice?.globalDiscount) || 0,
    totalTax: Number(invoice?.totalTax) || 0,
    shippingCost: Number(invoice?.shippingCost) || 0,
    departmentId: invoice?.departmentId || undefined,
    projectId: invoice?.projectId || undefined,

    items:
      invoice?.items.map((item) => ({
        id: generateId(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        taxRateId: item.taxRateId || undefined,
        productId: item.productId || undefined,
        accountId: item.accountId || undefined,
      })) || [],
  });

  const parseManualDate = (value: string): Date | null => {
    const trimmed = value.trim();
    const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;

    const parsedBySetting = parse(trimmed, inputDateFormat, new Date());
    if (isValid(parsedBySetting)) {
      return parsedBySetting;
    }

    const isoMatch = trimmed.match(isoFormat);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }

    return null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);
        return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
      });
    }
  };

  // When Sales Order is selected, populate items
  const handleSalesOrderChange = async (soId: string) => {
    setFormData((prev) => ({ ...prev, salesOrderId: soId }));

    if (soId) {
      try {
        const serializedFullSo = await getSalesOrder(soId);
        const fullSo = serializedFullSo
          ? SuperJSON.deserialize<SalesOrderWithDetails>(serializedFullSo)
          : null;

        if (fullSo) {
          // Auto-select customer
          setFormData((prev) => ({
            ...prev,
            contactId: fullSo.contactId,
            departmentId: fullSo.departmentId || prev.departmentId,
            projectId: fullSo.projectId || prev.projectId
          }));

          // Populate items from SO
          const newItems = fullSo.items.map((item) => ({
            id: generateId(),
            productId: item.productId,
            description: item.product?.name || "Item",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice), // Assuming unitPrice exists on SO Item
            discount: 0,
            tax: 0,
            taxRateId: (item as any).taxRateId || taxRates.find(r => r.code === "VAT-S")?.id,
          }));

          setFormData((prev) => ({ ...prev, items: newItems }));
        } else {
          toast({
            title: "Sales order not found",
            description: "Order tidak ditemukan pada company aktif",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch SO details", error);
        toast({
          title: "Failed to load order",
          description: "Gagal memuat detail sales order",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateId(),
          productId: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
          taxRateId: taxRates.find(r => r.code === "VAT-S")?.id,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof (typeof formData.items)[0],
    value: string | number | undefined,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productId") {
      const product = products.find((p: { id: string }) => p.id === value);
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unitPrice = Number(product.price || 0);
      }
    }
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateItemValues = (item: (typeof formData.items)[0]) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * ((item.discount || 0) / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    let taxAmount = 0;
    if (item.taxRateId) {
      const rateObj = taxRates.find(r => r.id === item.taxRateId);
      if (rateObj) {
        taxAmount = taxableAmount * (Number(rateObj.rate) / 100);
      }
    } else {
      taxAmount = item.tax || 0;
    }

    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, total };
  };

  useEffect(() => {
    const calculatedTotalTax = formData.items.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = subtotal * ((item.discount || 0) / 100);
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = item.taxRateId
        ? taxableAmount *
          ((Number(taxRates.find((r) => r.id === item.taxRateId)?.rate ?? 0)) / 100)
        : (item.tax || 0);
      return sum + taxAmount;
    }, 0);

    if (Math.abs(calculatedTotalTax - formData.totalTax) > 0.001) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({ ...prev, totalTax: calculatedTotalTax }));
    }
  }, [formData.items, formData.totalTax, taxRates]);

  const itemsNetTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemValues(item).taxableAmount,
    0,
  );

  const totalAmount =
    itemsNetTotal -
    (formData.globalDiscount || 0) +
    (formData.shippingCost || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!formData.contactId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }
    // Note: invoiceNumber might be auto-generated by backend if empty, 
    // but form usually requires it if shown. 
    // The Purchase form alerts if empty. 
    // The Sales actions.ts I read allows empty and generates it.
    // I will make it optional in validation here if the backend handles it, 
    // but let's stick to the purchase form pattern for now, 
    // OR allow it to be empty if the user didn't type it (let backend generate).
    // The purchase form says: if (!formData.invoiceNumber) alert...
    // I'll assume for Sales it might be auto-generated.

    if (formData.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const submissionData = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item),
        attachmentIds: attachments.map((a) => a.id),
      };
      let result;
      if (isEditing && invoice) {
        result = await updateSalesInvoice(invoice.id, submissionData);
      } else {
        result = await createSalesInvoice(submissionData);
      }

      if (result.success) {
        const createdInvoice =
          !isEditing && result.data
            ? SuperJSON.deserialize<{ id: string; invoiceNumber?: string | null }>(result.data)
            : null;
        if (createdInvoice?.id) {
          const customerName =
            customers.find((customer) => customer.id === formData.contactId)?.name ||
            null;
          await alert({
            title: "Invoice Masih Draft",
            description: buildSalesInvoiceDraftSavedDescription({
              invoiceNumber: createdInvoice.invoiceNumber,
              customerName,
            }),
            confirmText: "Mengerti",
          });
          router.push(`/sales/invoices/${createdInvoice.id}/edit`);
        } else {
          router.push("/sales/invoices");
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async () => {
    if (!invoice) return;
    const summaryItemsCount = invoice.items?.length || 0;
    const summaryTotal = Number(invoice.totalAmount || 0);
    const summaryPaid = (invoice.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const summaryRemaining = Math.max(summaryTotal - summaryPaid, 0);
    if (
      !(await confirm({
        title: "Post Invoice",
        description: [
          `Invoice: ${invoice.invoiceNumber}`,
          `Customer: ${invoice.contact?.name || "-"}`,
          `Jumlah item produk/jasa: ${summaryItemsCount}`,
          `Nominal transaksi: ${formatCurrency(summaryTotal)}`,
          `Sisa tagihan saat ini: ${formatCurrency(summaryRemaining)}`,
          "Aksi ini akan membuat jurnal dan tidak bisa dibatalkan.",
        ].join("\n"),
      }))
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await postSalesInvoice(invoice.id);
      if (result.success) {
        toast({
          title: result.data?.processed ? "Posted" : "Queued",
          description: result.data?.processed ? (
            "Invoice posted successfully"
          ) : (
            <span>
              {result.data?.alreadyQueued
                ? "Invoice posting already queued."
                : "Invoice posting queued for processing."}{" "}
              {result.data?.outboxId ? (
                <Link
                  href={`/admin/integrations/outbox?search=${encodeURIComponent(
                    result.data.outboxId,
                  )}`}
                  className="underline"
                >
                  View outbox
                </Link>
              ) : null}
            </span>
          ),
        });
        router.refresh();
        setPostActionOpen(true);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to post invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    const confirmed = await confirm({
      title: "Cancel invoice?",
      description: "Invoice akan dibatalkan. Jika sudah posted, sistem membuat reversal journal otomatis.",
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cancelSalesInvoice(invoice.id);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel invoice",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Cancelled", description: "Invoice cancelled successfully" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSalesOrders = formData.contactId
    ? salesOrders.filter((so) => so.contactId === formData.contactId)
    : salesOrders;
  const salesOrderOptions = filteredSalesOrders.map((so) => {
    const topItems = so.items.slice(0, 2).map((item) => item.product?.name || "Item").join(", ");
    const moreCount = Math.max(0, so.items.length - 2);
    const itemsLabel = `${topItems}${moreCount > 0 ? ` +${moreCount}` : ""}`;
    return {
      value: so.id,
      label: so.orderNumber,
      subtitle: `${so.contact?.name || "-"} • ${itemsLabel || "-"}`,
      meta: formatCurrency(Number(so.totalAmount || 0)),
    };
  });
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subtitle: [c.phone, c.address].filter(Boolean).join(" • "),
  }));
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    subtitle: p.category?.name || p.sku || "-",
    meta: formatCurrency(Number(p.price || 0)),
  }));
  
  const showDimensionFields = departments.length > 0 || projects.length > 0;

  useEffect(() => {
    if (isEditing || !initialSalesOrderId || hasAppliedInitialSalesOrder.current) {
      return;
    }
    hasAppliedInitialSalesOrder.current = true;
    void handleSalesOrderChange(initialSalesOrderId);
  }, [initialSalesOrderId, isEditing]);

  const handleSendInvoiceWhatsApp = async () => {
    if (!invoice) return;
    if (!invoice?.contact?.phone) {
      await createContactCommunicationLog({
        contactId: invoice.contactId,
        eventType: "SALES_INVOICE",
        sourceType: "SALES_INVOICE",
        sourceId: invoice.id,
        target: undefined,
        message: `Gagal kirim WA invoice ${invoice.invoiceNumber}: nomor telepon tidak tersedia`,
        status: "FAILED",
        errorMessage: "Customer phone number is not available",
      });
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: t("whatsapp_missing_phone"),
      });
      return;
    }

    const normalized = normalizePhoneForWhatsApp(invoice.contact.phone);
    if (!normalized) {
      await createContactCommunicationLog({
        contactId: invoice.contactId,
        eventType: "SALES_INVOICE",
        sourceType: "SALES_INVOICE",
        sourceId: invoice.id,
        target: invoice.contact.phone || undefined,
        message: `Gagal kirim WA invoice ${invoice.invoiceNumber}: format nomor tidak valid`,
        status: "FAILED",
        errorMessage: "Customer phone format is invalid for WhatsApp",
      });
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: t("whatsapp_invalid_phone"),
      });
      return;
    }

    const locale = pathname.split("/").filter(Boolean)[0] || "id";
    const baseUrl = window.location.origin;
    const trackingLink = await createPublicTrackingLink({
      baseUrl,
      locale,
      sourceType: "SALES_INVOICE",
      sourceId: invoice.id,
      contactId: invoice.contactId,
    });
    const invoiceUrl = trackingLink.url;
    const totalAmount = Number(invoice.totalAmount || 0);
    const balanceDue = Number(invoice.balanceDue || 0);
    const preview = await buildCompanyCommunicationPreview({
      eventKey: "SALES_INVOICE_ISSUED",
      vars: {
        customer_name: invoice.contact.name,
        doc_number: invoice.invoiceNumber,
        amount: totalAmount.toLocaleString("id-ID"),
        remaining_amount: balanceDue.toLocaleString("id-ID"),
        doc_url: invoiceUrl,
        public_tracking_url: invoiceUrl,
        public_invoice_url: invoiceUrl,
        status: invoice.status,
        date: formatDate(invoice.invoiceDate),
        is_service: invoice.salesOrder?.isServiceOrder ? "Yes" : "No",
        service_status: invoice.salesOrder?.serviceWorkflowStatus || "-",
      },
    });
    if (!preview.isEnabled) {
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: "Template komunikasi SALES_INVOICE_ISSUED sedang nonaktif",
      });
      return;
    }
    setNotifyPhone(normalized);
    setNotifyMessage(preview.message);
    setNotifyContext({ contactId: invoice.contactId, sourceId: invoice.id });
    setNotifyOpen(true);
  };

  return (
    <PageFormLayout>
      <form onSubmit={handleSubmit} className="w-full min-w-0 max-w-full overflow-x-hidden">
        <PageFormHeader>
          <PageFormTitle title={isEditing ? "Edit Sales Invoice" : "New Sales Invoice"} />
          <PageFormActions className="w-full justify-start md:w-auto md:justify-end">
            <div className="flex w-full flex-wrap gap-2 [&>button]:w-full sm:[&>button]:w-auto">
            {invoice?.salesOrderId && (
              <Button asChild type="button" variant="outline" size="sm">
                <Link href={existingShipmentId ? `/sales/shipments/${existingShipmentId}/edit` : `/sales/shipments/new?salesOrderId=${invoice.salesOrderId}`}>
                  {existingShipmentId ? "Open Shipment" : "Create Shipment"}
                </Link>
              </Button>
            )}
            {invoice && (
              <Button asChild type="button" variant="outline" size="sm">
                <Link href={existingPaymentId ? `/sales/payments/${existingPaymentId}` : `/sales/payments/new?salesInvoiceId=${invoice.id}`}>
                  {existingPaymentId ? "Open Payment" : "Create Payment"}
                </Link>
              </Button>
            )}
            {invoice && (
              <Button asChild type="button" variant="outline" size="sm">
                <Link
                  href={`/admin/integrations/outbox?search=${encodeURIComponent(invoice.id)}`}
                >
                  Outbox
                </Link>
              </Button>
            )}
            {invoice && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReportPreviewOpen(true)}
              >
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
            {invoice && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendInvoiceWhatsApp}
              >
                {t("send_whatsapp")}
              </Button>
            )}
            {invoice?.status === "DRAFT" && (
              <Button
                type="button"
                variant="default"
                onClick={handlePost}
                disabled={isLoading}
              >
                Post Invoice
              </Button>
            )}
            {invoice && invoice.status !== "CANCELLED" && invoice.status !== "PAID" && invoice.status !== "PARTIALLY_PAID" && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleCancelInvoice}
                disabled={isLoading}
              >
                Cancel Invoice
              </Button>
            )}
            {!readonly && (
              <>
                <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update" : "Create"}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  window.close();
                }
              }}
            >
              Close
            </Button>
            </div>
          </PageFormActions>
        </PageFormHeader>
        <PageFormContent className="mt-4 grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden border-none bg-transparent p-0 shadow-none">
          <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
            <Card className="w-full min-w-0 max-w-full overflow-hidden">
              <CardContent className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("sales_order_optional")}</label>
                  <SearchableSelect
                    value={formData.salesOrderId || ""}
                    onValueChange={(val) => handleSalesOrderChange(val || "")}
                    options={salesOrderOptions}
                    placeholder="Select Sales Order"
                    disabled={readonly}
                  />
                </div>

                {showDimensionFields ? (
                  <div className="col-span-1 grid grid-cols-1 gap-4 md:col-span-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("department")}</label>
                      <SearchableSelect
                        value={formData.departmentId || ""}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, departmentId: val || null }))}
                        options={departments.map(d => ({ value: d.id, label: d.name }))}
                        placeholder={t("placeholder_select_department")}
                        disabled={readonly}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("project")}</label>
                      <SearchableSelect
                        value={formData.projectId || ""}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val || null }))}
                        options={projects.map(p => ({ value: p.id, label: p.name }))}
                        placeholder={t("placeholder_select_project")}
                        disabled={readonly}
                      />
                    </div>
                  </div>
                ) : null}

                <CustomInput
                  label={t("invoice_number")}
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      invoiceNumber: e.target.value,
                    }))
                  }
                  placeholder="Leave empty to auto-generate"
                  disabled={readonly}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("customer")}</label>
                  <SearchableSelect
                    value={formData.contactId}
                    onValueChange={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        contactId: val || "",
                        salesOrderId: undefined,
                      }));
                    }}
                    options={customerOptions}
                    placeholder="Select Customer"
                    disabled={readonly || !!formData.salesOrderId}
                  />
                </div>

                <div className="space-y-1">
                  <Label>{t("invoice_date")}</Label>
                  <div className="flex items-center gap-2">
                    <CustomInput
                      type="text"
                      value={invoiceDateInput}
                      placeholder={inputDateFormat}
                      onChange={(e) => setInvoiceDateInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseManualDate(invoiceDateInput);
                        if (!parsed) {
                          toast({
                            title: "Invalid date",
                            description: `Use format ${inputDateFormat}`,
                            variant: "destructive",
                          });
                          setInvoiceDateInput(format(formData.invoiceDate, inputDateFormat));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, invoiceDate: parsed }));
                        setInvoiceDateInput(format(parsed, inputDateFormat));
                      }}
                      disabled={readonly}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={readonly}
                          className={cn("shrink-0")}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.invoiceDate}
                          onSelect={(date) => {
                            if (!date) return;
                            setFormData((prev) => ({ ...prev, invoiceDate: date }));
                            setInvoiceDateInput(format(date, inputDateFormat));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>{t("due_date")}</Label>
                  <div className="flex items-center gap-2">
                    <CustomInput
                      type="text"
                      value={dueDateInput}
                      placeholder={inputDateFormat}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseManualDate(dueDateInput);
                        if (!parsed) {
                          toast({
                            title: "Invalid date",
                            description: `Use format ${inputDateFormat}`,
                            variant: "destructive",
                          });
                          setDueDateInput(format(formData.dueDate, inputDateFormat));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, dueDate: parsed }));
                        setDueDateInput(format(parsed, inputDateFormat));
                      }}
                      disabled={readonly}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={readonly}
                          className={cn("shrink-0")}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => {
                            if (!date) return;
                            setFormData((prev) => ({ ...prev, dueDate: date }));
                            setDueDateInput(format(date, inputDateFormat));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {isEditing && (
                  <CustomSelect
                    value={formData.status}
                    label={t("status")}
                     
                    onValueChange={(val: any) =>
                      setFormData((prev) => ({ ...prev, status: val }))
                    }
                      disabled={
                        readonly ||
                        invoice.status !== "DRAFT"
                      }

                  >
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ISSUED">Issued</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">
                      Partially Paid
                    </SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </CustomSelect>
                )}
                <CustomTextarea
                  label={t("notes")}
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add notes here..."
                  disabled={readonly}
                />
                <div className="md:col-span-2">
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAttachmentDialogOpen(true)}
                      className="w-fit"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Attachments ({attachments.length})
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1 text-sm"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {file.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{tCommon("products")}</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <TableOverflow
                    className="max-w-[calc(100vw-2rem)]"
                    minWidthClassName="min-w-[980px] md:min-w-[1100px]"
                  >
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="min-w-[220px] whitespace-nowrap">{tCommon("product")}</TableHead>
                        {/* Removed Account Header to match cells */}
                        <TableHead className="w-[110px] whitespace-nowrap">{tCommon("quantity")}</TableHead>
                        <TableHead className="w-[150px] whitespace-nowrap">{tCommon("price")}</TableHead>
                        <TableHead className="w-[130px] whitespace-nowrap">
                          {tCommon("discount")} (%)
                        </TableHead>
                        <TableHead className="w-[260px] whitespace-nowrap">{tCommon("tax_rate")}</TableHead>
                        <TableHead className="w-[140px] whitespace-nowrap">{tCommon("total")}</TableHead>
                        {!readonly && (
                          <TableHead className="w-[50px]"></TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={formData.items}
                        strategy={verticalListSortingStrategy}
                      >
                        {formData.items.map((item, index) => (
                          <SortableTableRow key={item.id} id={item.id}>
                            <TableCell className="min-w-[220px]">
                              <SearchableSelect
                                value={item.productId || ""}
                                onValueChange={(val) =>
                                  handleItemChange(index, "productId", val || "")
                                }
                                options={productOptions}
                                placeholder={tCommon("placeholder_select_product")}
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <CustomInput
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                value={item.unitPrice}
                                onChange={(val) =>
                                  handleItemChange(
                                    index,
                                    "unitPrice",
                                    Number(val),
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <CustomInput
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "discount",
                                    Number(e.target.value),
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell className="w-[260px]">
                              <div className="flex items-center gap-2">
                              <select
                                className="flex h-10 w-full min-w-[160px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={item.taxRateId || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "taxRateId",
                                    e.target.value === "" ? undefined : e.target.value
                                  )
                                }
                                disabled={readonly}
                              >
                                <option value="">Manual</option>
                                {taxRates.map((rate) => (
                                  <option key={rate.id} value={rate.id}>
                                    {rate.name} ({Number(rate.rate)}%)
                                  </option>
                                ))}
                              </select>
                              {!item.taxRateId && (
                                <CustomInput
                                  type="number"
                                  min="0"
                                  value={item.tax}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "tax",
                                      Number(e.target.value),
                                    )
                                  }
                                  disabled={readonly}
                                  className="w-[88px]"
                                  placeholder={tCommon("amount")}
                                />
                              )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {calculateItemValues(
                                  item,
                                ).total.toLocaleString()}
                              </div>
                            </TableCell>
                            {!readonly && (
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mb-0.5"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            )}
                          </SortableTableRow>
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                  </TableOverflow>
                </DndContext>
                {formData.items.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No items added.
                  </div>
                )}
                <div className="flex flex-col gap-4 border-t p-4 sm:flex-row sm:items-start sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={readonly}
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleAddItem}
                  >
                    <PlusIcon /> Add Item
                  </Button>
                  <div className="w-full space-y-2 sm:w-1/3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        Subtotal (Net)
                      </span>
                      <span>{itemsNetTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">
                        Global Discount
                      </span>
                      <CurrencyInput
                        value={formData.globalDiscount}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            globalDiscount: Number(val),
                          }))
                        }
                        disabled={readonly}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Total Tax</span>
                      <CurrencyInput
                        value={formData.totalTax}
                        onChange={() => { }}
                        disabled={true}
                        className="w-24 h-8 bg-muted"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Shipping</span>
                      <CurrencyInput
                        value={formData.shippingCost}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingCost: Number(val),
                          }))
                        }
                        disabled={readonly}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">
                        {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageFormContent>

        <WhatsAppNotificationDialog
          open={notifyOpen}
          onOpenChange={setNotifyOpen}
          phone={notifyPhone}
          message={notifyMessage}
          onMessageChange={setNotifyMessage}
          context={
            notifyContext
              ? {
                  contactId: notifyContext.contactId,
                  eventType: "SALES_INVOICE",
                  sourceType: "SALES_INVOICE",
                  sourceId: notifyContext.sourceId,
                }
              : null
          }
        />
      </form>

      <AttachmentDialog
        open={isAttachmentDialogOpen}
        onOpenChange={setIsAttachmentDialogOpen}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        uploadAction={async (formData) => {
          const res = await uploadFile(formData);
          return res;
        }}
        readonly={readonly}
      />

      {invoice && (
        <ReportPreviewDialog
          isOpen={isReportPreviewOpen}
          onOpenChange={setIsReportPreviewOpen}
          code="SALES_INVOICE"
          input={{ invoiceId: invoice.id }}
          title={`Invoice #${invoice.invoiceNumber}`}
        />
      )}
      <Dialog open={postActionOpen} onOpenChange={setPostActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Berhasil Diposting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReportPreviewOpen(true)}>
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button type="button" variant="outline" onClick={handleSendInvoiceWhatsApp}>
              WA Customer
            </Button>
            <Button type="button" onClick={() => setPostActionOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageFormLayout>
  );
}
