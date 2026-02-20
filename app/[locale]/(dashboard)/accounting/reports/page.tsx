export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  Percent,
} from "lucide-react";

import { useTranslations } from "next-intl";

export default function ReportsPage() {
  const t = useTranslations("Accounting");
  const tCommon = useTranslations("Common");
  const reports = [
    {
      title: t("profit_loss"),
      description: t("profit_loss_desc"),
      href: "/accounting/reports/profit-loss",
      icon: TrendingUp,
    },
    {
      title: t("balance_sheet"),
      description: t("balance_sheet_desc"),
      href: "/accounting/reports/balance-sheet",
      icon: Landmark,
    },
    {
      title: t("cash_flow"),
      description: t("cash_flow_desc"),
      href: "/accounting/reports/cash-flow",
      icon: ArrowLeftRight,
    },
    {
      title: t("equity_statement"),
      description: t("equity_statement_desc"),
      href: "/accounting/reports/equity",
      icon: BarChart3,
    },
    {
      title: t("tax_summary"),
      description: t("tax_summary_desc"),
      href: "/accounting/reports/tax-summary",
      icon: Percent,
    },
    {
      title: t("financial_ratios"),
      description: t("financial_ratios_desc"),
      href: "/accounting/reports/ratios",
      icon: BarChart3,
    },
    {
      title: t("data_validation"),
      description: t("data_validation_desc"),
      href: "/accounting/reports/validation",
      icon: TrendingUp, // Using generic icon for now, maybe AlertTriangle if available
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-lg font-bold mb-2">{t("financial_reports")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Link href={report.href} key={report.href}>
            <Card className="from-primary/5 bg-linear-to-t hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">
                  {report.title}
                </CardTitle>
                <report.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mt-2">
                  {report.description}
                </CardDescription>
                <div className="flex items-center text-sm text-primary mt-4 font-medium">
                  {t("view_report")} <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
