"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getUnpaidSalesInvoices,
  getCashAccounts,
  createSalesPayment,
  updateSalesPayment,
  postSalesPayment,
  ensureSalesShipmentForInvoice,
  applyServiceWarrantyFromPayment,
} from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { format } from "date-fns";
import { Loader2, Paperclip, PrinterIcon } from "lucide-react";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { useTranslations } from "next-intl";
import {
  SalesInvoice,
  Contact,
} from "@/prisma/generated/prisma/client";
import { SalesPaymentInput, SalesPaymentWithDetails } from "../types";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { useFormatCurrency } from "@/hooks";

import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SuperJSONResult } from "superjson";
import { UnifiedPaymentMethod } from "@/lib/payments/payment-methods";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableOverflow } from "@/components/ui/table-overflow";
import { WhatsAppNotificationDialog } from "@/components/communication/whatsapp-notification-dialog";
import { buildCompanyCommunicationPreview, createPublicTrackingLink } from "@/app/[locale]/communications/actions";
import { normalizePhoneForWhatsApp } from "@/lib/communication/company-communication";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SalesPaymentFormProps {
  initialData?: SalesPaymentWithDetails;
  readonly?: boolean;
  departments?: Department[];
  projects?: Project[];
  initialSalesInvoiceId?: string;
}

type PaymentMethodOption = {
  id: string;
  name: string;
  method: "CASH" | "BANK";
  accountType: "CASH" | "BANK" | "PETTY_CASH" | "EWALLET";
  bankName: string | null;
  accountNumber: string | null;
  glCode: string;
  glName: string;
  isDefault: boolean;
};

export function SalesPaymentForm({
  initialData,
  readonly = false,
  departments = [],
  projects = [],
  initialSalesInvoiceId,
}: SalesPaymentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyContext, setNotifyContext] = useState<{
    contactId: string;
    sourceId: string;
  }>();
  const formatCurrency = useFormatCurrency();
  const [postActionOpen, setPostActionOpen] = useState(false);
  const [postActionPaymentId, setPostActionPaymentId] = useState<string | null>(initialData?.id || null);

  const [formData, setFormData] = useState<SalesPaymentInput>({
    paymentNumber: initialData?.paymentNumber || "",
    contactId: initialData?.contactId || "",
    salesInvoiceId: initialData?.salesInvoiceId || "",
    paymentDate: initialData?.paymentDate
      ? new Date(initialData.paymentDate)
      : new Date(),
    amount: initialData ? Number(initialData.amount) : 0,
    reference: initialData?.reference || "",
    notes: initialData?.notes || "",
    cashAccountId: initialData?.cashAccountId || "",
    method: (initialData?.method || "CASH") as UnifiedPaymentMethod,
    departmentId: initialData?.departmentId || null,
    projectId: initialData?.projectId || null,
    attachmentIds: initialData?.attachments?.map((a) => a.id) || [],
  });

  // Date string for input
  const [dateStr, setDateStr] = useState(
    format(
      initialData?.paymentDate ? new Date(initialData.paymentDate) : new Date(),
      "yyyy-MM-dd",
    )
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialData?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || []
  );
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [autoCreateShipment, setAutoCreateShipment] = useState(true);
  const [warrantyMode, setWarrantyMode] = useState<
    | "WARRANTY_1W"
    | "WARRANTY_2W"
    | "WARRANTY_3W"
    | "WARRANTY_4W"
    | "WARRANTY_1M"
    | "WARRANTY_2M"
    | "WARRANTY_3M"
    | "WARRANTY_6M"
    | "WARRANTY_12M"
  >("WARRANTY_1M");
  const showDimensionFields = departments.length > 0 || projects.length > 0;

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["unpaid-sales-invoices"],
    queryFn: async () => {
      const data = await getUnpaidSalesInvoices();
      return SuperJSON.deserialize<
        (SalesInvoice & { contact: Contact; payments: any[] })[]
      >(data as SuperJSONResult);
    },
    enabled: !readonly,
  });

  const { data: cashAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: async () => {
      const data = await getCashAccounts();
      return SuperJSON.deserialize<{
        methods: PaymentMethodOption[];
      }>(data as SuperJSONResult);
    },
    enabled: !readonly,
  });

  const paymentMethods = useMemo(
    () => cashAccountsData?.methods || [],
    [cashAccountsData?.methods],
  );
  const invoiceOptions = useMemo(
    () =>
      (invoicesData || []).map((invoice) => {
        const totalPaid = invoice.payments.reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          0
        );
        const remaining = Number(invoice.totalAmount) - totalPaid;
        return {
          value: invoice.id,
          label: invoice.invoiceNumber,
          subtitle: invoice.contact?.name || "-",
          meta: `Due ${formatCurrency(remaining)}`,
        };
      }),
    [invoicesData, formatCurrency],
  );

  const selectedInvoice =
    (initialData?.salesInvoice as any) ||
    ((invoicesData || []).find((inv) => inv.id === formData.salesInvoiceId) as any);
  const totalInvoiceAmount = selectedInvoice ? Number(selectedInvoice.totalAmount || 0) : 0;
  const totalPaidAmount = selectedInvoice
    ? (selectedInvoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    : 0;
  const remainingAmount = Math.max(totalInvoiceAmount - totalPaidAmount, 0);

  useEffect(() => {
    if (!initialData && initialSalesInvoiceId && !formData.salesInvoiceId) {
      setFormData((prev) => ({ ...prev, salesInvoiceId: initialSalesInvoiceId }));
    }
  }, [initialSalesInvoiceId, initialData, formData.salesInvoiceId]);

  useEffect(() => {
    if (!initialData && formData.salesInvoiceId && invoicesData) {
      const invoice = invoicesData.find(
        (inv) => inv.id === formData.salesInvoiceId
      );
      if (invoice) {
        const totalPaid = invoice.payments.reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          0
        );
        const remaining = Number(invoice.totalAmount) - totalPaid;

        setFormData((prev) => ({
          ...prev,
          amount: remaining,
          contactId: invoice.contactId,
          // paymentNumber will be generated on server if empty
        }));
      }
    }
  }, [formData.salesInvoiceId, invoicesData, initialData]);

  useEffect(() => {
    if (readonly || initialData || !cashAccountsData) return;
    if (formData.cashAccountId) return;
    const defaultMethod = paymentMethods.find((method) => method.isDefault);
    const nextMethod = defaultMethod || paymentMethods[0];
    if (nextMethod) {
      setFormData((prev) => ({
        ...prev,
        cashAccountId: nextMethod.id,
        method: nextMethod.method as UnifiedPaymentMethod,
      }));
    }
  }, [cashAccountsData, paymentMethods, formData.cashAccountId, readonly, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readonly) return;
    const shouldProceed = await confirm({
      title: "Konfirmasi Save & Post Payment",
      description: [
        `Invoice: ${selectedInvoice?.invoiceNumber || "-"}`,
        `Customer: ${selectedInvoice?.contact?.name || "-"}`,
        `Jumlah item produk/jasa: ${selectedInvoice?.items?.length || 0}`,
        `Total invoice: ${formatCurrency(totalInvoiceAmount)}`,
        `Sisa tagihan: ${formatCurrency(remainingAmount)}`,
        `Nominal dibayarkan: ${formatCurrency(Number(formData.amount || 0))}`,
        "Aksi ini akan menyimpan payment lalu langsung posting jurnal.",
      ].join("\n"),
      confirmText: "Save & Post",
    });
    if (!shouldProceed) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        paymentDate: new Date(dateStr),
        attachmentIds: attachments.map((a) => a.id),
      };

      let result;
      if (initialData) {
        result = await updateSalesPayment(initialData.id, payload);
      } else {
        if (autoCreateShipment && payload.salesInvoiceId) {
          await ensureSalesShipmentForInvoice(payload.salesInvoiceId);
        }
        result = await createSalesPayment(payload);
      }

      if (result.success) {
        const createdPayment =
          !initialData &&
          result.data &&
          typeof result.data === "object" &&
          "json" in result.data
            ? SuperJSON.deserialize<{ id: string }>(result.data as SuperJSONResult)
            : null;

        const paymentIdToPost = createdPayment?.id || initialData?.id || null;
        if (paymentIdToPost) {
          const postResult = await postSalesPayment(paymentIdToPost);
          if (!postResult.success) {
            toast({
              variant: "destructive",
              title: tCommon("error"),
              description: postResult.error || tCommon("something_went_wrong"),
            });
            router.push(`/sales/payments/${paymentIdToPost}/edit`);
            router.refresh();
            return;
          }
          await applyServiceWarrantyFromPayment({
            paymentId: paymentIdToPost,
            mode: warrantyMode,
          });
          setPostActionPaymentId(paymentIdToPost);
          setPostActionOpen(true);
          toast({ title: tCommon("success"), description: "Payment berhasil disimpan dan diposting." });
          return;
        }

        toast({
          title: "Success",
          description: initialData
            ? "Payment updated successfully"
            : "Payment created successfully",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerPhone = normalizePhoneForWhatsApp(
    selectedInvoice?.contact?.phone || initialData?.contact?.phone || null,
  );
  const handleNotifyCustomer = async () => {
    if (!customerPhone) {
      toast({ variant: "destructive", title: "Error", description: "Nomor WhatsApp tidak tersedia atau format tidak valid." });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const locale = window.location.pathname.split("/").filter(Boolean)[0] || "id";
      // Gunakan invoice yang dipilih atau dari initialData
      const invoiceId = selectedInvoice?.id || initialData?.salesInvoiceId;
      const contactId = selectedInvoice?.contactId || initialData?.contactId;
      const paymentNumber = initialData?.paymentNumber || "-";
      const remainingAmount = Number(selectedInvoice?.balanceDue || initialData?.salesInvoice?.balanceDue || 0) - Number(formData.amount || 0);
      
      let trackingUrl = "";
      if (invoiceId && contactId) {
        const link = await createPublicTrackingLink({
          baseUrl: window.location.origin,
          locale,
          sourceType: "SALES_INVOICE",
          sourceId: invoiceId,
          contactId: contactId,
        });
        trackingUrl = link.url;
      }

      const preview = await buildCompanyCommunicationPreview({
        eventKey: "SALES_PAYMENT_POSTED",
        vars: {
          customer_name: selectedInvoice?.contact?.name || initialData?.contact?.name || "Customer",
          doc_number: paymentNumber,
          amount: formatCurrency(Number(formData.amount || 0)),
          remaining_amount: formatCurrency(Math.max(0, remainingAmount)),
          doc_url: trackingUrl,
          public_tracking_url: trackingUrl,
          public_invoice_url: trackingUrl,
          is_service: selectedInvoice?.salesOrder?.isServiceOrder ? "Yes" : "No",
          service_status: selectedInvoice?.salesOrder?.serviceWorkflowStatus || "-",
        },
      });

      if (!preview.isEnabled) {
        toast({ variant: "destructive", title: "Error", description: "Template komunikasi SALES_PAYMENT_POSTED sedang nonaktif" });
        return;
      }

      setNotifyPhone(customerPhone);
      setNotifyMessage(preview.message);
      if (initialData?.id && contactId) {
        setNotifyContext({ contactId, sourceId: initialData.id });
      }
      setNotifyOpen(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat template WhatsApp." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((isLoadingInvoices || isLoadingAccounts) && !readonly) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Filter invoices if editing, to include the current invoice even if paid
  // But for now, let's assume if editing, we just show the current invoice info or allow changing if logic permits.
  // Ideally, changing invoice on an existing payment is complex. 
  // For simplicity, let's allow selecting from unpaid invoices or the current one.

  return (
    <PageFormLayout>
      <form onSubmit={handleSubmit} className="w-full min-w-0 max-w-full overflow-x-hidden">
        <PageFormHeader>
          <PageFormTitle title={initialData ? (readonly ? t("view_payment") : t("edit_payment")) : t("new_payment")} />
          <PageFormActions className="w-full flex-wrap justify-start md:w-auto md:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {readonly ? tCommon("back") : tCommon("cancel")}
            </Button>
            {initialData ? (
              <Button asChild type="button" variant="outline">
                <Link
                  href={`/admin/integrations/outbox?search=${encodeURIComponent(initialData.id)}`}
                >
                  Outbox
                </Link>
              </Button>
            ) : null}
            {initialData ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReportPreviewOpen(true)}
              >
                <PrinterIcon className="mr-2 h-4 w-4" />
                {tCommon("print")}
              </Button>
            ) : null}
            {!readonly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save & Post
              </Button>
            )}
          </PageFormActions>
        </PageFormHeader>
        <PageFormContent className="mt-4 grid w-full min-w-0 max-w-full gap-6 overflow-x-hidden pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("invoice")}</label>
            <SearchableSelect
              value={formData.salesInvoiceId}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, salesInvoiceId: val || "" }))
              }
              options={
                initialData && readonly && initialData.salesInvoice
                  ? [{
                      value: initialData.salesInvoice.id,
                      label: initialData.salesInvoice.invoiceNumber,
                      subtitle: initialData.contact?.name || "-",
                    }]
                  : invoiceOptions
              }
              placeholder={t("placeholder_select_invoice")}
              disabled={readonly || !!initialData}
            />
          </div>

          <div className="md:col-span-2 rounded-md border p-3 text-sm min-w-0 overflow-hidden">
            <div className="mb-2 font-medium">Order Context</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="break-words">Invoice: {selectedInvoice?.invoiceNumber || "-"}</div>
              <div className="break-words">Sales Order: {selectedInvoice?.salesOrder?.orderNumber || "-"}</div>
              <div className="break-words">Customer: {selectedInvoice?.contact?.name || "-"}</div>
              <div className="break-words">Due Date: {selectedInvoice?.dueDate ? format(new Date(selectedInvoice.dueDate), "yyyy-MM-dd") : "-"}</div>
              <div className="break-words">Total Invoice: {selectedInvoice?.totalAmount ? formatCurrency(Number(selectedInvoice.totalAmount)) : "-"}</div>
              <div className="break-words">
                Remaining: {selectedInvoice
                  ? formatCurrency(Number(selectedInvoice.totalAmount) - (selectedInvoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0))
                  : "-"}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-md border p-3 text-sm min-w-0 overflow-hidden">
            <div className="mb-2 font-medium">Order Items</div>
            {selectedInvoice?.items?.length ? (
              <TableOverflow minWidthClassName="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk/Jasa</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <TableRow key={item.id || idx}>
                      <TableCell className="max-w-[260px] whitespace-normal break-words">{item.product?.name || item.description || "-"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.unitPrice || 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.totalPrice || Number(item.quantity || 0) * Number(item.unitPrice || 0)))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableOverflow>
            ) : (
              <div className="text-muted-foreground">Belum ada item.</div>
            )}
          </div>

          {!initialData ? (
            <div className="md:col-span-2 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoCreateShipment}
                  onChange={(event) => setAutoCreateShipment(event.target.checked)}
                />
                Auto create shipping (default on)
              </label>
            </div>
          ) : null}

          <div className="md:col-span-2 rounded-md border p-3">
            <div className="mb-2 font-medium">Garansi</div>
            <SearchableSelect
              value={warrantyMode}
              onValueChange={(value) =>
                setWarrantyMode(
                  (value as
                    | "WARRANTY_1W"
                    | "WARRANTY_2W"
                    | "WARRANTY_3W"
                    | "WARRANTY_4W"
                    | "WARRANTY_1M"
                    | "WARRANTY_2M"
                    | "WARRANTY_3M"
                    | "WARRANTY_6M"
                    | "WARRANTY_12M") || "WARRANTY_1M",
                )
              }
              options={[
                { value: "WARRANTY_1W", label: "1 Minggu" },
                { value: "WARRANTY_2W", label: "2 Minggu" },
                { value: "WARRANTY_3W", label: "3 Minggu" },
                { value: "WARRANTY_4W", label: "4 Minggu" },
                { value: "WARRANTY_1M", label: "1 Bulan" },
                { value: "WARRANTY_2M", label: "2 Bulan" },
                { value: "WARRANTY_3M", label: "3 Bulan" },
                { value: "WARRANTY_6M", label: "6 Bulan" },
                { value: "WARRANTY_12M", label: "12 Bulan" },
              ]}
              placeholder="Pilih durasi garansi"
            />
          </div>

          <CustomInput
            label={t("payment_number")}
            value={formData.paymentNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, paymentNumber: e.target.value }))
            }
            placeholder={t("placeholder_auto_generate")}
            disabled={readonly || !!initialData} // Usually payment number is fixed
          />

          <CustomInput
            label={t("payment_date")}
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={readonly}
            required
          />

          <CustomSelect
            label={t("payment_method")}
            value={formData.cashAccountId}
            onValueChange={(val) =>
              setFormData((prev) => {
                const selected = paymentMethods.find((method) => method.id === val);
                return {
                  ...prev,
                  cashAccountId: val,
                  method: (selected?.method || "CASH") as UnifiedPaymentMethod,
                };
              })
            }
            placeholder={t("placeholder_select_method")}
            disabled={readonly}
          >
            {readonly && initialData?.cashAccount ? (
              <SelectItem value={initialData.cashAccount.id}>
                {initialData.cashAccount.name}
              </SelectItem>
            ) : (
              paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  [{method.method}] {method.name}
                </SelectItem>
              ))
            )}
          </CustomSelect>

          <CustomInput
            label={t("deposit_to")}
            value={
              paymentMethods.find((method) => method.id === formData.cashAccountId)
                ? `${paymentMethods.find((method) => method.id === formData.cashAccountId)?.glCode} - ${paymentMethods.find((method) => method.id === formData.cashAccountId)?.glName}`
                : "-"
            }
            disabled
          />

          <CustomInput
            label={t("amount")}
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))
            }
            placeholder="0.00"
            disabled={readonly}
            min={0}
            step={0.01}
          />

          <CustomInput
            label={t("reference")}
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reference: e.target.value }))
            }
            placeholder={t("placeholder_reference")}
            disabled={readonly}
          />

          {showDimensionFields ? (
            <div className="grid grid-cols-1 gap-4 md:col-span-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("department")}</label>
                <SearchableSelect
                  value={formData.departmentId || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, departmentId: val || null }))
                  }
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  placeholder={t("placeholder_select_department")}
                  disabled={readonly}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("project")}</label>
                <SearchableSelect
                  value={formData.projectId || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, projectId: val || null }))
                  }
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder={t("placeholder_select_project")}
                  disabled={readonly}
                />
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <CustomTextarea
              label={t("notes")}
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={t("placeholder_notes")}
              disabled={readonly}
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{tCommon("attachments")}</label>
              {!readonly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttachmentDialogOpen(true)}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  {tCommon("add_files")}
                </Button>
              )}
            </div>
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
                  {!readonly && (
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((a) => a.id !== file.id)
                        )
                      }
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {attachments.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {tCommon("no_attachments")}
                </span>
              )}
            </div>
          </div>
        </PageFormContent>
      </form>

      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        uploadAction={async (formData) => {
          const res = await uploadFile(formData);
          return res;
        }}
      />
      {selectedInvoice?.id || initialData?.salesInvoiceId ? (
        <ReportPreviewDialog
          isOpen={isReportPreviewOpen}
          onOpenChange={setIsReportPreviewOpen}
          code="SALES_INVOICE"
          input={{ invoiceId: selectedInvoice?.id || initialData?.salesInvoiceId }}
          title={`Sales Invoice`}
        />
      ) : null}
      <Dialog open={postActionOpen} onOpenChange={setPostActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran Berhasil Diposting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportPreviewOpen(true)}
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNotifyCustomer}
              disabled={!customerPhone}
            >
              WA Customer
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPostActionOpen(false);
                if (postActionPaymentId) {
                  router.push(`/sales/payments/${postActionPaymentId}`);
                } else {
                  router.push("/sales/payments");
                }
                router.refresh();
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
                eventType: "SALES_PAYMENT_POSTED",
                sourceType: "SALES_PAYMENT",
                sourceId: notifyContext.sourceId,
              }
            : null
        }
      />
    </PageFormLayout>
  );
}
