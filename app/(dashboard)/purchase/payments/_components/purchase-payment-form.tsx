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
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { useFormatDate } from "@/hooks";

interface PurchasePaymentFormProps {
  initialData?: PurchasePaymentWithDetails;
  readonly?: boolean;
}

export function PurchasePaymentForm({
  initialData,
  readonly = false,
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
    cashAccountId: initialData?.cashAccountId || "",
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

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["unpaid-invoices"],
    queryFn: async () => {
      const data = await getUnpaidInvoices();
      return SuperJSON.deserialize<
        (PurchaseInvoice & { contact: Contact; payments: any[] })[]
      >(data);
    },
  });

  const { data: cashAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: async () => {
      const data = await getCashAccounts();
      return SuperJSON.deserialize<CashAccount[]>(data);
    },
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
              onClick={() => setAttachmentDialogOpen(true)}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Attachments ({attachments.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {readonly ? "Back" : "Cancel"}
            </Button>
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
            label="Cash/Bank Account"
            value={formData.cashAccountId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, cashAccountId: val }))
            }
            placeholder="Select account"
            disabled={readonly}
          >
            {cashAccountsData?.map((account) => (
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
