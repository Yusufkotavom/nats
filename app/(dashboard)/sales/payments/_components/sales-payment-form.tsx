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
  getUnpaidSalesInvoices,
  getCashAccounts,
  createSalesPayment,
  updateSalesPayment,
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
  SalesInvoice,
  Contact,
  CashAccount,
} from "@/prisma/generated/prisma/client";
import { SalesPaymentInput, SalesPaymentWithDetails } from "../types";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { useFormatDate, useFormatCurrency } from "@/hooks";

import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SuperJSONResult } from "superjson";

interface SalesPaymentFormProps {
  initialData?: SalesPaymentWithDetails;
  readonly?: boolean;
  departments?: Department[];
  projects?: Project[];
}

export function SalesPaymentForm({
  initialData,
  readonly = false,
  departments = [],
  projects = [],
}: SalesPaymentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formatDate = useFormatDate();
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
    method: initialData?.method || "",
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
      return SuperJSON.deserialize<CashAccount[]>(data as SuperJSONResult);
    },
    enabled: !readonly,
  });

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
        result = await createSalesPayment(payload);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: initialData
            ? "Payment updated successfully"
            : "Payment created successfully",
        });
        router.push("/sales/payments");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      });
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
      <form onSubmit={handleSubmit}>
        <PageFormHeader>
          <PageFormTitle title={initialData ? (readonly ? "View Payment" : "Edit Payment") : "New Payment"} />
          <PageFormActions>
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
                {initialData ? "Update Payment" : "Save Payment"}
              </Button>
            )}
          </PageFormActions>
        </PageFormHeader>
        <PageFormContent className="grid gap-6 md:grid-cols-2 pt-6 mt-4">
          <CustomSelect
            label="Invoice"
            value={formData.salesInvoiceId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, salesInvoiceId: val }))
            }
            placeholder="Select invoice to pay"
            disabled={readonly || !!initialData} // Disable changing invoice on edit for safety
          >
            {initialData && readonly && initialData.salesInvoice ? (
              <SelectItem value={initialData.salesInvoice.id}>
                {initialData.salesInvoice.invoiceNumber} - {initialData.contact?.name}
              </SelectItem>
            ) : (
              invoicesData?.map((invoice) => {
                const totalPaid = invoice.payments.reduce(
                  (sum: number, p: any) => sum + Number(p.amount),
                  0
                );
                const remaining = Number(invoice.totalAmount) - totalPaid;
                return (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {invoice.contact.name} (Due:{" "}
                    {formatCurrency(remaining)})
                  </SelectItem>
                );
              })
            )}
          </CustomSelect>

          <CustomInput
            label="Payment Number"
            value={formData.paymentNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, paymentNumber: e.target.value }))
            }
            placeholder="Auto-generated if empty"
            disabled={readonly || !!initialData} // Usually payment number is fixed
          />

          <CustomInput
            label="Payment Date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={readonly}
            required
          />

          <CustomSelect
            label="Payment Method"
            value={formData.method || ""}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, method: val }))
            }
            placeholder="Select method"
            disabled={readonly}
          >
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="CHECK">Check</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </CustomSelect>

          <CustomSelect
            label="Deposit To (Account)"
            value={formData.cashAccountId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, cashAccountId: val }))
            }
            placeholder="Select account"
            disabled={readonly}
          >
            {readonly && initialData?.cashAccount ? (
              <SelectItem value={initialData.cashAccount.id}>{initialData.cashAccount.name}</SelectItem>
            ) : (
              cashAccountsData?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.accountNumber})
                </SelectItem>
              ))
            )}
          </CustomSelect>

          <CustomInput
            label="Amount"
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
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reference: e.target.value }))
            }
            placeholder="e.g. Check #123"
            disabled={readonly}
          />

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
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

          <div className="md:col-span-2">
            <CustomTextarea
              label="Notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any notes here..."
              disabled={readonly}
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Attachments</label>
              {!readonly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttachmentDialogOpen(true)}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Files
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
                  No attachments
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
    </PageFormLayout>
  );
}
