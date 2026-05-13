"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import {
  getProfitAndLoss,
  getBalanceSheet,
  getCashFlowStatement,
  ReportAccountLine,
} from "../actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountTreeRow } from "../_components/account-tree-row";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQueries } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useTranslations } from "next-intl";

export default function FullReportPage() {
  const t = useTranslations("Accounting");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const [showComparative, setShowComparative] = useState(false);
  const [comparativeStartDate, setComparativeStartDate] = useState(
    new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0]
  );
  const [comparativeEndDate, setComparativeEndDate] = useState(
    new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0]
  );
  const [comparativeDate, setComparativeDate] = useState(
    new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0]
  );

  const [plQuery, bsQuery, cfQuery] = useQueries({
    queries: [
      {
        queryKey: [
          "full-report-pl",
          startDate,
          endDate,
          showComparative ? comparativeStartDate : null,
          showComparative ? comparativeEndDate : null,
        ],
        queryFn: async () => {
          const res = await getProfitAndLoss(
            startDate,
            endDate,
            showComparative ? comparativeStartDate : undefined,
            showComparative ? comparativeEndDate : undefined
          );
          return res.success ? res.data : null;
        },
      },
      {
        queryKey: ["full-report-bs", asOfDate, showComparative ? comparativeDate : null],
        queryFn: async () => {
          const res = await getBalanceSheet(
            asOfDate,
            showComparative ? comparativeDate : undefined
          );
          return res.success ? res.data : null;
        },
      },
      {
        queryKey: [
          "full-report-cf",
          startDate,
          endDate,
          showComparative ? comparativeStartDate : null,
          showComparative ? comparativeEndDate : null,
        ],
        queryFn: async () => {
          const res = await getCashFlowStatement(
            startDate,
            endDate,
            showComparative ? comparativeStartDate : undefined,
            showComparative ? comparativeEndDate : undefined
          );
          return res.success ? res.data : null;
        },
      },
    ],
  });

  const loading = plQuery.isLoading || bsQuery.isLoading || cfQuery.isLoading;

  const formatPercentage = (val: number) => {
    if (isNaN(val)) return "-";
    return `${val.toFixed(1)}%`;
  };

  const renderSectionHeader = (label: string) => (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
      <TableCell colSpan={showComparative ? 5 : 2} className="font-bold text-lg">
        {label}
      </TableCell>
    </TableRow>
  );

  const renderTotalLine = (label: string, current: number, previous?: number) => {
    const change = current - (previous || 0);
    const percent = previous && previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    return (
      <TableRow className="font-bold border-t border-black bg-muted/20">
        <TableCell>{label}</TableCell>
        <TableCell className="text-right">{formatCurrency(current)}</TableCell>
        {showComparative && (
          <>
            <TableCell className="text-right text-muted-foreground">
              {formatCurrency(previous || 0)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatCurrency(change)}
            </TableCell>
            <TableCell
              className={cn(
                "text-right",
                percent < 0 ? "text-red-500" : "text-green-500"
              )}
            >
              {formatPercentage(percent)}
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  const renderCashFlowRow = (item: ReportAccountLine) => (
    <TableRow key={item.accountId || item.name} className="hover:bg-muted/50">
      <TableCell>{item.name}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
      {showComparative && (
        <>
          <TableCell className="text-right text-muted-foreground">
            {formatCurrency(item.previousAmount || 0)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {formatCurrency(item.change || 0)}
          </TableCell>
          <TableCell
            className={cn(
              "text-right",
              (item.changePercentage || 0) < 0 ? "text-red-500" : "text-green-500"
            )}
          >
            {formatPercentage(item.changePercentage || 0)}
          </TableCell>
        </>
      )}
    </TableRow>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">{t("full_report")}</h1>
          <Button
            onClick={() => {
              plQuery.refetch();
              bsQuery.refetch();
              cfQuery.refetch();
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("run_report")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("from")}:</span>
            <CustomInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("to")}:</span>
            <CustomInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("as_of")}:</span>
            <CustomInput
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          <div className="flex items-center gap-2">
            <Checkbox
              id="comparative"
              checked={showComparative}
              onCheckedChange={(c) => setShowComparative(!!c)}
            />
            <Label htmlFor="comparative">{t("compare")}</Label>
          </div>

          {showComparative && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{t("comp_from")}:</span>
                <CustomInput
                  type="date"
                  value={comparativeStartDate}
                  onChange={(e) => setComparativeStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{t("comp_to")}:</span>
                <CustomInput
                  type="date"
                  value={comparativeEndDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setComparativeEndDate(value);
                    setComparativeDate(value);
                  }}
                  className="w-auto"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {plQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">{t("profit_loss")}</CardTitle>
            <p className="text-center text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t("account")}</TableHead>
                  <TableHead className="text-right">{t("current")}</TableHead>
                  {showComparative && (
                    <>
                      <TableHead className="text-right text-muted-foreground">{t("previous")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("change")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">%</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSectionHeader(t("revenue"))}
                {plQuery.data.revenue.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} showComparative={showComparative} />
                ))}
                {renderTotalLine(t("total_revenue"), plQuery.data.totalRevenue, plQuery.data.previousTotalRevenue)}

                {renderSectionHeader(t("expenses"))}
                {plQuery.data.expenses.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} showComparative={showComparative} />
                ))}
                {renderTotalLine(t("total_expenses"), plQuery.data.totalExpenses, plQuery.data.previousTotalExpenses)}

                {renderTotalLine(t("net_income"), plQuery.data.netIncome, plQuery.data.previousNetIncome)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {bsQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">{t("balance_sheet")}</CardTitle>
            <p className="text-center text-muted-foreground">
              {t("as_of")} {formatDate(asOfDate)}
              {showComparative && ` ${t("compared_to")} ${formatDate(comparativeDate)}`}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t("account")}</TableHead>
                  <TableHead className="text-right">{t("current")}</TableHead>
                  {showComparative && (
                    <>
                      <TableHead className="text-right text-muted-foreground">{t("previous")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("change")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">%</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSectionHeader(t("assets"))}
                {bsQuery.data.assets.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} showComparative={showComparative} />
                ))}
                {renderTotalLine(t("total_assets"), bsQuery.data.totalAssets, bsQuery.data.previousTotalAssets)}

                {renderSectionHeader(t("liabilities"))}
                {bsQuery.data.liabilities.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} showComparative={showComparative} />
                ))}
                {renderTotalLine(
                  t("total_liabilities"),
                  bsQuery.data.totalLiabilities,
                  bsQuery.data.previousTotalLiabilities
                )}

                {renderSectionHeader(t("equity"))}
                {bsQuery.data.equity.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} showComparative={showComparative} />
                ))}
                {renderTotalLine(t("total_equity"), bsQuery.data.totalEquity, bsQuery.data.previousTotalEquity)}

                {renderTotalLine(
                  t("total_liab_equity"),
                  bsQuery.data.totalLiabilitiesAndEquity,
                  bsQuery.data.previousTotalLiabilitiesAndEquity
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {cfQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">{t("cash_flow")}</CardTitle>
            <p className="text-center text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t("account")}</TableHead>
                  <TableHead className="text-right">{t("current")}</TableHead>
                  {showComparative && (
                    <>
                      <TableHead className="text-right text-muted-foreground">{t("previous")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("change")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">%</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSectionHeader("Operating Activities")}
                {cfQuery.data.operatingActivities.map(renderCashFlowRow)}
                {renderTotalLine(
                  "Net Cash from Operating",
                  cfQuery.data.netCashProvidedByOperating,
                  cfQuery.data.previousNetCashProvidedByOperating
                )}

                {renderSectionHeader("Investing Activities")}
                {cfQuery.data.investingActivities.map(renderCashFlowRow)}
                {renderTotalLine(
                  "Net Cash from Investing",
                  cfQuery.data.netCashProvidedByInvesting,
                  cfQuery.data.previousNetCashProvidedByInvesting
                )}

                {renderSectionHeader("Financing Activities")}
                {cfQuery.data.financingActivities.map(renderCashFlowRow)}
                {renderTotalLine(
                  "Net Cash from Financing",
                  cfQuery.data.netCashProvidedByFinancing,
                  cfQuery.data.previousNetCashProvidedByFinancing
                )}

                {renderTotalLine(
                  "Net Increase in Cash",
                  cfQuery.data.netIncreaseInCash,
                  cfQuery.data.previousNetIncreaseInCash
                )}
                {renderTotalLine(
                  "Cash at Beginning",
                  cfQuery.data.cashAtBeginning,
                  cfQuery.data.previousCashAtBeginning
                )}
                {renderTotalLine("Cash at End", cfQuery.data.cashAtEnd, cfQuery.data.previousCashAtEnd)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
