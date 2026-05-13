"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/ui/custom-input";
import { resetTransactionalData } from "../actions";

const CONFIRMATION_TEXT = "RESET TRANSACTIONS";

type Props = {
  preview: {
    purchaseInvoices: number;
    purchasePayments: number;
    salesInvoices: number;
    salesPayments: number;
    inventoryMovements: number;
    journalEntries: number;
  };
};

export function DataResetForm({ preview }: Props) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");

  const totalRecords = useMemo(
    () =>
      preview.purchaseInvoices +
      preview.purchasePayments +
      preview.salesInvoices +
      preview.salesPayments +
      preview.inventoryMovements +
      preview.journalEntries,
    [preview],
  );

  const canSubmit = confirmation.trim().toUpperCase() === CONFIRMATION_TEXT;

  const handleReset = () => {
    startTransition(async () => {
      const result = await resetTransactionalData(confirmation);
      if (result.success) {
        toast({
          title: tCommon("success"),
          description: t("transaction_reset_success"),
        });
        setConfirmation("");
        return;
      }

      toast({
        title: tCommon("error"),
        description: result.error || t("transaction_reset_failed"),
        variant: "destructive",
      });
    });
  };

  return (
    <Card className="max-w-3xl border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          {t("transaction_data_reset")}
        </CardTitle>
        <CardDescription>{t("transaction_data_reset_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-red-50 p-3 text-sm text-red-800">
          {t("transaction_data_reset_warning")}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Purchase Invoices: {preview.purchaseInvoices}</div>
          <div>Purchase Payments: {preview.purchasePayments}</div>
          <div>Sales Invoices: {preview.salesInvoices}</div>
          <div>Sales Payments: {preview.salesPayments}</div>
          <div>Inventory Movements: {preview.inventoryMovements}</div>
          <div>Journal Entries: {preview.journalEntries}</div>
          <div className="col-span-2 font-semibold">Total Preview: {totalRecords}</div>
        </div>

        <CustomInput
          label={`${t("type_to_confirm")}: ${CONFIRMATION_TEXT}`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={CONFIRMATION_TEXT}
        />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending || !canSubmit}
          onClick={handleReset}
        >
          {isPending ? tCommon("saving") : t("reset_transaction_data")}
        </Button>
      </CardFooter>
    </Card>
  );
}

