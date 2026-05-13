"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { updatePOSSettings, type POSProductVisibilityMode } from "../actions";

type POSSettings = {
  id: string | null;
  posProductVisibilityMode: POSProductVisibilityMode;
  serviceChargePercent: number;
  taxPercent: number;
  additionalFeeAmount: number;
  additionalFeeLabel: string;
};

export function POSSettingsForm({ initialData }: { initialData: POSSettings }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<POSProductVisibilityMode>(
    initialData.posProductVisibilityMode || "POS_ONLY",
  );
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(
    initialData.serviceChargePercent || 0,
  );
  const [taxPercent, setTaxPercent] = useState<number>(initialData.taxPercent || 0);
  const [additionalFeeAmount, setAdditionalFeeAmount] = useState<number>(
    initialData.additionalFeeAmount || 0,
  );
  const [additionalFeeLabel, setAdditionalFeeLabel] = useState<string>(
    initialData.additionalFeeLabel || "",
  );

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePOSSettings({
        posProductVisibilityMode: mode,
        serviceChargePercent,
        taxPercent,
        additionalFeeAmount,
        additionalFeeLabel,
      });
      if (result.success) {
        toast({ title: tCommon("success"), description: t("settings_saved") });
      } else {
        toast({
          title: tCommon("error"),
          description: result.error || t("failed_update_company"),
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("pos_settings")}</CardTitle>
        <CardDescription>{t("manage_pos_details")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="posProductVisibilityMode">{t("pos_product_visibility_mode")}</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as POSProductVisibilityMode)}>
            <SelectTrigger id="posProductVisibilityMode" className="w-full">
              <SelectValue placeholder={t("select_pos_product_visibility_mode")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POS_ONLY">{t("pos_product_visibility_pos_only")}</SelectItem>
              <SelectItem value="ALL_ACTIVE">{t("pos_product_visibility_all_active")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceChargePercent">{t("pos_service_charge_percent")}</Label>
          <Input
            id="serviceChargePercent"
            type="number"
            min={0}
            step="0.01"
            value={serviceChargePercent}
            onChange={(e) => setServiceChargePercent(Number(e.target.value || 0))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxPercent">{t("pos_tax_percent")}</Label>
          <Input
            id="taxPercent"
            type="number"
            min={0}
            step="0.01"
            value={taxPercent}
            onChange={(e) => setTaxPercent(Number(e.target.value || 0))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalFeeLabel">{t("pos_additional_fee_label")}</Label>
          <Input
            id="additionalFeeLabel"
            value={additionalFeeLabel}
            onChange={(e) => setAdditionalFeeLabel(e.target.value)}
            placeholder={t("pos_additional_fee_label_placeholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalFeeAmount">{t("pos_additional_fee_amount")}</Label>
          <Input
            id="additionalFeeAmount"
            type="number"
            min={0}
            step="0.01"
            value={additionalFeeAmount}
            onChange={(e) => setAdditionalFeeAmount(Number(e.target.value || 0))}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save_changes")}
        </Button>
      </CardFooter>
    </Card>
  );
}
