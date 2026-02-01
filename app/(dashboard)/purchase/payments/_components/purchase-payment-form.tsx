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
import { Loader2 } from "lucide-react";
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
import { PurchasePaymentInput } from "../types";
import { Card, CardContent } from "@/components/ui/card";

export function PurchasePaymentForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<PurchasePaymentInput>({
    paymentNumber: "",
    contactId: "",
    purchaseInvoiceId: "",
    paymentDate: new Date(),
    amount: 0,
    reference: "",
    notes: "",
    cashAccountId: "",
  });

  // Date string for input
  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd"));

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
    if (formData.purchaseInvoiceId && invoicesData) {
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
            `PAY-${format(new Date(), "yyyyMMdd")}-${invoice.invoiceNumber}`,
        }));
      }
    }
  }, [formData.purchaseInvoiceId, invoicesData]);

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
          <PageFormTitle title="New Payment" />
          <PageFormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Payment
            </Button>
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
                  {format(new Date(invoice.dueDate), "MMM d")}) - Rem:{" "}
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
            label="Date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />

          <CustomSelect
            label="Pay From"
            value={formData.cashAccountId}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, cashAccountId: val }))
            }
            placeholder="Select account"
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
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                amount: Number(e.target.value),
              }))
            }
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
          />

          <div className="col-span-2">
            <CustomTextarea
              label="Notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </PageFormContent>
      </form>
    </PageFormLayout>
  );
}
