"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildCompanyCommunicationPreview, upsertCompanyCommunicationTemplate } from "@/app/[locale]/communications/actions";
import type { CompanyCommunicationEventKey } from "@/prisma/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Row = {
  eventKey: CompanyCommunicationEventKey;
  label: string;
  channel: "WHATSAPP";
  isEnabled: boolean;
  template: string;
};

export function CommunicationSettingsForm({ initialData }: { initialData: Row[] }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(initialData);
  const [testPhone, setTestPhone] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [activePreviewKey, setActivePreviewKey] = useState<CompanyCommunicationEventKey | null>(null);

  const updateRow = (eventKey: CompanyCommunicationEventKey, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row) => (row.eventKey === eventKey ? { ...row, ...patch } : row)));
  };

  const handlePreview = (eventKey: CompanyCommunicationEventKey) => {
    startTransition(async () => {
      try {
        const preview = await buildCompanyCommunicationPreview({
          eventKey,
          vars: {
            customer_name: "Pelanggan Contoh",
            doc_number: "DOC-001",
            amount: "150.000",
            remaining_amount: "0",
            doc_url: "https://example.com/doc/001",
            warranty_text: "7 hari",
          },
        });
        setPreviewMessage(preview.message);
        setActivePreviewKey(eventKey);
      } catch (error) {
        toast({
          title: tCommon("error"),
          description: error instanceof Error ? error.message : t("failed_update_company"),
          variant: "destructive",
        });
      }
    });
  };

  const handleOpenTestWhatsApp = () => {
    const digits = testPhone.replace(/\D/g, "");
    if (!digits) {
      toast({ title: tCommon("error"), description: "Nomor test wajib diisi", variant: "destructive" });
      return;
    }
    const normalized = digits.startsWith("62")
      ? digits
      : digits.startsWith("0")
        ? `62${digits.slice(1)}`
        : digits.startsWith("8")
          ? `62${digits}`
          : digits;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(previewMessage)}`, "_blank", "noopener,noreferrer");
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        for (const row of rows) {
          await upsertCompanyCommunicationTemplate({
            eventKey: row.eventKey,
            isEnabled: row.isEnabled,
            template: row.template,
          });
        }
        toast({ title: tCommon("success"), description: t("settings_saved") });
      } catch (error) {
        toast({
          title: tCommon("error"),
          description: error instanceof Error ? error.message : t("failed_update_company"),
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("communication_settings")}</CardTitle>
        <CardDescription>{t("communication_settings_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.eventKey} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label>{row.label}</Label>
              <Switch
                checked={row.isEnabled}
                onCheckedChange={(checked) => updateRow(row.eventKey, { isEnabled: checked })}
              />
            </div>
            <Textarea
              value={row.template}
              onChange={(event) => updateRow(row.eventKey, { template: event.target.value })}
              placeholder="{{customer_name}}..."
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" onClick={() => handlePreview(row.eventKey)} disabled={isPending}>
                  Preview/Test
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{row.label} Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    value={activePreviewKey === row.eventKey ? previewMessage : ""}
                    readOnly
                    className="min-h-[140px]"
                  />
                  <Input
                    value={testPhone}
                    onChange={(event) => setTestPhone(event.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                  <Button type="button" onClick={handleOpenTestWhatsApp} disabled={!previewMessage}>
                    Open Test WhatsApp
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}

        <div className="text-xs text-muted-foreground">
          {t("communication_template_variables_hint")}
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : t("save_configuration")}
        </Button>
      </CardContent>
    </Card>
  );
}
