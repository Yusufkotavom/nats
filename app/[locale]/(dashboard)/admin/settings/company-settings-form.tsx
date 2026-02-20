"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectItem } from "@/components/ui/select";
import { getCompanyProfile, updateCompanyProfile } from "./actions";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTranslations } from "next-intl";

export function CompanySettingsForm({
  initialData,
}: {
  initialData: Awaited<ReturnType<typeof getCompanyProfile>>;
}) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState(
    initialData?.currencySymbol || ""
  );

  const handleCurrencyChange = (value: string) => {
    // Map currency code to symbol (simple map, could be expanded)
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      IDR: "Rp",
      JPY: "¥",
    };
    setCurrencySymbol(symbols[value] || "");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      website: formData.get("website") as string,
      taxId: formData.get("taxId") as string,
      currency: formData.get("currency") as string,
      currencySymbol: formData.get("currencySymbol") as string,
      dateFormat: formData.get("dateFormat") as string,
      currencyFormat: formData.get("currencyFormat") as string,
      locale: formData.get("locale") as string,
      timezone: formData.get("timezone") as string,
    };

    startTransition(async () => {
      const result = await updateCompanyProfile(data);
      if (result.success) {
        setSuccess(t("company_profile_updated"));
      } else {
        setError(result.error || t("failed_update_company"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("company_profile")}</CardTitle>
        <CardDescription>
          {t("manage_company_details")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4 pb-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("company_name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">{t("tax_id")}</Label>
              <Input
                id="taxId"
                name="taxId"
                defaultValue={initialData?.taxId || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{tAuth("email_label")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initialData?.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{tCommon("phone")}</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={initialData?.phone || ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">{tCommon("address")}</Label>
              <Input
                id="address"
                name="address"
                defaultValue={initialData?.address || ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">{t("website")}</Label>
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={initialData?.website || ""}
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <h3 className="text-lg font-medium">{t("regional_settings")}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currency">{t("currency")}</Label>
                <Select
                  name="currency"
                  defaultValue={initialData?.currency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_currency")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencySymbol">{t("currency_symbol")}</Label>
                <Input
                  id="currencySymbol"
                  name="currencySymbol"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencyFormat">{t("currency_format")}</Label>
                <Select
                  name="currencyFormat"
                  defaultValue={initialData?.currencyFormat || "standard"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_currency_format")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      Standard (1,234.56)
                    </SelectItem>
                    <SelectItem value="european">
                      European (1.234,56)
                    </SelectItem>
                    <SelectItem value="indian">Indian (1,23,456.78)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">{t("date_format")}</Label>
                <Select
                  name="dateFormat"
                  defaultValue={initialData?.dateFormat || "MM/dd/yyyy"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_date_format")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/dd/yyyy">
                      MM/dd/yyyy (12/31/2023)
                    </SelectItem>
                    <SelectItem value="dd/MM/yyyy">
                      dd/MM/yyyy (31/12/2023)
                    </SelectItem>
                    <SelectItem value="yyyy-MM-dd">
                      yyyy-MM-dd (2023-12-31)
                    </SelectItem>
                    <SelectItem value="dd MMM yyyy">
                      dd MMM yyyy (31 Dec 2023)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale">{t("locale")}</Label>
                <Select name="locale" defaultValue={initialData?.locale}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_locale")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="id-ID">Indonesian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("timezone")}</Label>
                <Select name="timezone" defaultValue={initialData?.timezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_timezone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">New York</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Asia/Jakarta">Jakarta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tCommon("error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 text-green-500">
              <CheckCircle2 className="h-4 w-4 stroke-green-500" />
              <AlertTitle>{tCommon("success")}</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin cursor-pointer" />
            )}
            {tCommon("save_changes")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
