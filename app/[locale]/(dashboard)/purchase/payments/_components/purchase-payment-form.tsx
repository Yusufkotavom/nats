"use client";

import { useState, useEffect } from "react";
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
  getUnpaidInvoices,
  getCashAccounts,
  createPurchasePayment,
} from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { format } from "date-fns";
import { Loader2, Paperclip } from "lucide-react";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import {
  PurchaseInvoice,
  Contact,
  CashAccount,
} from "@/prisma/generated/prisma/client";
import { PurchasePaymentInput, PurchasePaymentWithDetails } from "../types";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { useFormatDate } from "@/hooks";

import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SuperJSONResult } from "superjson";
import { UNIFIED_PAYMENT_METHODS } from "@/lib/payments/payment-methods";

interface PurchasePaymentFormProps {
  initialData?: PurchasePaymentWithDetails;
  readonly?: boolean;
  departments?: Department[];
  projects?: Project[];
}

export function PurchasePaymentForm({
  initialData,
  readonly = false,
  departments = [],
  projects = [],
}: PurchasePaymentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formatDate = useFormatDate();

  const [formData, setFormData] = useState<PurchasePaymentInput>({
    paymentNumber: initialData?.paymentNumber || "",
    contactId: initialData?.contactId || "",
    purchaseInvoiceId: initialData?.purchaseInvoiceId || "",
    paymentDate: initialData?.paymentDate ? new Date(initialData.paymentDate) : new Date(),
    amount: initialData ? Number(initialData.amount) : 0,
    reference: initialData?.reference || "",
    notes: initialData?.notes || "",
    departmentId: initialData?.departmentId || null,
    projectId: initialData?.projectId || null,
    cashAccountId: initialData?.cashAccountId || "",
    method: initialData?.method || "CASH",
  });

  // Date string for input
  const [dateStr, setDateStr] = useState(
    format(
      initialData?.paymentDate ? new Date(initialData.paymentDate) : new Date(),
      "yyyy-MM-dd",
    ),
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialData?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || [],
  );
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const showDimensionFields = departments.length > 0 || projects.length > 0;

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["unpaid-invoices"],
    queryFn: async () => {
      const data = await getUnpaidInvoices();
      return SuperJSON.deserialize<
        (PurchaseInvoice & { contact: Contact; payments: any[] })[]
      >(data as unknown as SuperJSONResult);
    },
  });

  const { data: cashAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: async () => {
      const data = await getCashAccounts();
      return SuperJSON.deserialize<{
        accounts: CashAccount[];
        defaults: {
          CASH: string | null;
          CARD: string | null;
          QRIS: string | null;
        };
      }>(data as unknown as SuperJSONResult);
    },
  });

  const filteredCashAccounts = (cashAccountsData?.accounts || []).filter((account) => {
    if ((formData.method || "CASH") === "CASH") {
      return account.type === "CASH" || account.type === "PETTY_CASH";
    }
    return account.type === "BANK" || account.type === "EWALLET";
  });

  useEffect(() => {
    if (!initialData && formData.purchaseInvoiceId && invoicesData) {
      const invoice = invoicesData.find(
        (inv) => inv.id === formData.purchaseInvoiceId,
      );
      if (invoice) {
        const totalPaid = invoice.payments.reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          0,
        );
        const remaining = Number(invoice.totalAmount) - totalPaid;

        setFormData((prev) => ({
          ...prev,
          amount: remaining,
          contactId: invoice.contactId,
          paymentNumber:
            prev.paymentNumber ||
            `PAY-${invoice.invoiceNumber}`,
        }));
      }
    }
  }, [formData.purchaseInvoiceId, invoicesData, formatDate]);

  useEffect(() => {
    if (readonly || initialData || !cashAccountsData) return;
    const selectedMethod = (formData.method || "CASH") as "CASH" | "CARD" | "QRIS";
    const allowedIds = new Set(filteredCashAccounts.map((account) => account.id));
    const isCurrentValid = formData.cashAccountId && allowedIds.has(formData.cashAccountId);
    if (isCurrentValid) return;

    const defaultId = cashAccountsData.defaults[selectedMethod];
    const fallbackId = filteredCashAccounts[0]?.id || "";
    const nextId = defaultId && allowedIds.has(defaultId) ? defaultId : fallbackId;
    if (nextId && nextId !== formData.cashAccountId) {
      setFormData((prev) => ({ ...prev, cashAccountId: nextId }));
    }
  }, [cashAccountsData, filteredCashAccounts, formData.method, formData.cashAccountId, readonly, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.purchaseInvoiceId) {
      toast({
        title: "Error",
        description: "Please select an invoice",
        variant: "destructive",
      });
      return;
    }
    if (!formData.cashAccountId) {
      toast({
        title: "Error",
        description: "Please select a cash account",
        variant: "destructive",
      });
      return;
    }
    if (formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPurchasePayment({
        ...formData,
        paymentDate: new Date(dateStr),
        attachmentIds: attachments.map((a) => a.id),
      });

      if (!result.success) throw new Error(result.error);

      toast({ title: "Success", description: "Payment created successfully" });
      router.push("/purchase/payments");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingInvoices || isLoadingAccounts) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <PageFormLayout>
      <form onSubmit={handleSubmit}>
        <PageFormHeader>
          <PageFormTitle title={initialData ? "View Payment" : "New Payment"} />
          <PageFormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {readonly ? "Back" : "Cancel"}
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
            {!readonly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Payment
              </Button>
            )}
          </PageFormActions>
        </PageFormHeader>
        <PageFormContent className="grid gap-6 md:grid-cols-2 pt-6 mt-4">
          <CustomSelect
            label="Invoice"
            value={formData.purchaseInvoiceId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, purchaseInvoiceId: val }))
            }
            placeholder="Select invoice to pay"
            disabled={readonly}
          >
            {invoicesData?.map((invoice) => {
              const totalPaid = invoice.payments.reduce(
                (sum: number, p: any) => sum + Number(p.amount),
                0,
              );
              const remaining = Number(invoice.totalAmount) - totalPaid;
              return (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.contact.name} (Due:{" "}
                  {formatDate(invoice.dueDate)}) - Rem:{" "}
                  {remaining.toFixed(2)}
                </SelectItem>
              );
            })}
          </CustomSelect>

          <CustomInput
            label="Payment Number"
            value={formData.paymentNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                paymentNumber: e.target.value,
              }))
            }
          />

          <CustomInput
            label="Payment Date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={readonly}
          />

          <CustomSelect
            label="Payment Method"
            value={formData.method || "CASH"}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, method: val as typeof formData.method }))
            }
            placeholder="Select payment method"
            disabled={readonly}
          >
            {UNIFIED_PAYMENT_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </CustomSelect>

          <CustomSelect
            label="Cash/Bank Account"
            value={formData.cashAccountId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, cashAccountId: val }))
            }
            placeholder="Select account"
            disabled={readonly}
          >
            {filteredCashAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.type})
              </SelectItem>
            ))}
          </CustomSelect>

          <CustomInput
            label="Amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                amount: Number(e.target.value),
              }))
            }
            disabled={readonly}
          />

          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reference: e.target.value,
              }))
            }
            disabled={readonly}
          />

          {showDimensionFields ? (
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <SearchableSelect
                  value={formData.departmentId || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, departmentId: val || null }))
                  }
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  placeholder="Select Department"
                  disabled={readonly}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <SearchableSelect
                  value={formData.projectId || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, projectId: val || null }))
                  }
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Select Project"
                  disabled={readonly}
                />
              </div>
            </div>
          ) : null}

          <div className="col-span-2">
            <CustomTextarea
              label="Notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              disabled={readonly}
            />
          </div>

          <div className="col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttachmentDialogOpen(true)}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Attachments ({attachments.length})
            </Button>
          </div>



        </PageFormContent>
      </form>
      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        uploadAction={uploadFile}
        readonly={readonly}
      />
    </PageFormLayout>
  );
}
