"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { updatePOSSettings, type POSProductVisibilityMode } from "../actions";

type POSSettings = {
  id: string | null;
  posProductVisibilityMode: POSProductVisibilityMode;
};

export function POSSettingsForm({ initialData }: { initialData: POSSettings }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<POSProductVisibilityMode>(
    initialData.posProductVisibilityMode || "POS_ONLY",
  );

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePOSSettings({ posProductVisibilityMode: mode });
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
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save_changes")}
        </Button>
      </CardFooter>
    </Card>
  );
}
