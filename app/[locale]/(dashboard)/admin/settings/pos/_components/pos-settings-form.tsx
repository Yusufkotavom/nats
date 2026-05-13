"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { updatePOSSettings, type POSProductVisibilityMode } from "../actions";
import { Plus, Trash2 } from "lucide-react";

type POSSettings = {
  id: string | null;
  posProductVisibilityMode: POSProductVisibilityMode;
  feeSettings: {
    id?: string;
    name: string;
    category: "TAX" | "FEE";
    valueType: "PERCENTAGE" | "FIXED";
    value: number;
    sortOrder: number;
    isActive: boolean;
  }[];
};

export function POSSettingsForm({ initialData }: { initialData: POSSettings }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<POSProductVisibilityMode>(
    initialData.posProductVisibilityMode || "POS_ONLY",
  );
  const [feeSettings, setFeeSettings] = useState(initialData.feeSettings || []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePOSSettings({
        posProductVisibilityMode: mode,
        feeSettings: feeSettings.map((item, index) => ({ ...item, sortOrder: index })),
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

  const addFee = () => {
    setFeeSettings((prev) => [
      ...prev,
      {
        name: "",
        category: "FEE",
        valueType: "FIXED",
        value: 0,
        sortOrder: prev.length,
        isActive: true,
      },
    ]);
  };

  const updateFee = (index: number, patch: Partial<(typeof feeSettings)[number]>) => {
    setFeeSettings((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeFee = (index: number) => {
    setFeeSettings((prev) => prev.filter((_, i) => i !== index));
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

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label>{t("pos_fee_lines")}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFee}>
              <Plus className="mr-1 h-4 w-4" />
              {t("add_fee_line")}
            </Button>
          </div>
          <div className="space-y-3">
            {feeSettings.map((fee, index) => (
              <div key={`${fee.id || "new"}-${index}`} className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-12">
                <div className="md:col-span-3">
                  <Label>{t("fee_name")}</Label>
                  <Input
                    value={fee.name}
                    onChange={(e) => updateFee(index, { name: e.target.value })}
                    placeholder={t("pos_additional_fee_label_placeholder")}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t("fee_category")}</Label>
                  <Select value={fee.category} onValueChange={(v) => updateFee(index, { category: v as "TAX" | "FEE" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEE">{t("fee_category_fee")}</SelectItem>
                      <SelectItem value="TAX">{t("fee_category_tax")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>{t("fee_value_type")}</Label>
                  <Select
                    value={fee.valueType}
                    onValueChange={(v) => updateFee(index, { valueType: v as "PERCENTAGE" | "FIXED" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">{t("fee_value_type_fixed")}</SelectItem>
                      <SelectItem value="PERCENTAGE">{t("fee_value_type_percentage")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>{t("fee_value")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={fee.value}
                    onChange={(e) => updateFee(index, { value: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t("active")}</Label>
                  <div className="flex h-10 items-center">
                    <Switch
                      checked={fee.isActive}
                      onCheckedChange={(checked) => updateFee(index, { isActive: checked })}
                    />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <Label>&nbsp;</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive"
                    onClick={() => removeFee(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
