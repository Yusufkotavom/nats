"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getUnpaidSalesInvoices,
  getCashAccounts,
  createSalesPayment,
  updateSalesPayment,
  postSalesPayment,
  ensureSalesShipmentForInvoice,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"save" | "saveAndPost">("save");
  const formatCurrency = useFormatCurrency();

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

        if (!initialData && submitMode === "saveAndPost" && createdPayment?.id) {
          const postResult = await postSalesPayment(createdPayment.id);
          if (!postResult.success) {
            toast({
              variant: "destructive",
              title: tCommon("error"),
              description: postResult.error || tCommon("something_went_wrong"),
            });
            router.push(`/sales/payments/${createdPayment.id}/edit`);
            router.refresh();
            return;
          }
          toast({ title: tCommon("success"), description: t("post_success") });
          router.push("/sales/payments");
          router.refresh();
          return;
        }

        toast({
          title: "Success",
          description: initialData
            ? "Payment updated successfully"
            : "Payment created successfully",
        });
        if (createdPayment?.id) {
          router.push(`/sales/payments/${createdPayment.id}/edit`);
        } else {
          router.push("/sales/payments");
        }
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

  const handlePost = async () => {
    if (!initialData) return;
    try {
      setIsPosting(true);
      const result = await postSalesPayment(initialData.id);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: tCommon("error"),
          description: result.error || tCommon("something_went_wrong"),
        });
        return;
      }

      toast({
        title: tCommon("success"),
        description: t("post_success"),
      });
      router.push("/sales/payments");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: tCommon("something_went_wrong"),
      });
    } finally {
      setIsPosting(false);
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
            {initialData && !readonly ? (
              <Button type="button" variant="outline" onClick={handlePost} disabled={isPosting || isSubmitting}>
                {(isPosting || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("post")}
              </Button>
            ) : null}
            {!readonly && (
              <Button type="submit" disabled={isSubmitting || isPosting} onClick={() => setSubmitMode("save") }>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? t("update_payment") : t("save_payment")}
              </Button>
            )}
            {!readonly && !initialData && formData.salesInvoiceId ? (
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting || isPosting}
                onClick={() => setSubmitMode("saveAndPost")}
              >
                {(isSubmitting || isPosting) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("save_payment")} + {t("post")}
              </Button>
            ) : null}
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
      {initialData ? (
        <ReportPreviewDialog
          isOpen={isReportPreviewOpen}
          onOpenChange={setIsReportPreviewOpen}
          code="SALES_PAYMENT"
          input={{ paymentId: initialData.id }}
          title={`Sales Payment #${initialData.paymentNumber}`}
        />
      ) : null}
    </PageFormLayout>
  );
}
