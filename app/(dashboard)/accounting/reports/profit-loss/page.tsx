"use client";

import { useState } from "react";
import {
  getProfitAndLoss,
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
import { useQuery } from "@tanstack/react-query";
import { ExportButton, downloadCSV } from "../_components/export-button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportSectionProps {
  title: string;
  data: ReportAccountLine[];
  total: number;
  totalLabel: string;
  previousTotal?: number;
  showComparative?: boolean;
}

const ReportSection = ({
  title,
  data,
  total,
  totalLabel,
  previousTotal,
  showComparative,
}: ReportSectionProps) => {
  const formatCurrency = useFormatCurrency();
  const change = (total || 0) - (previousTotal || 0);
  const percent =
    previousTotal && previousTotal !== 0
      ? (change / Math.abs(previousTotal)) * 100
      : 0;

  const formatPercentage = (val: number) => {
    if (isNaN(val)) return "-";
    return `${val.toFixed(1)}%`;
  };

  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell
          colSpan={showComparative ? 5 : 2}
          className="font-bold text-lg"
        >
          {title}
        </TableCell>
      </TableRow>
      {data.map((node) => (
        <AccountTreeRow
          key={node.accountId}
          node={node}
          showComparative={showComparative}
        />
      ))}
      <TableRow className="font-bold border-t-2 border-black">
        <TableCell>{totalLabel}</TableCell>
        <TableCell className="text-right">{formatCurrency(total)}</TableCell>
        {showComparative && (
          <>
            <TableCell className="text-right text-muted-foreground">
              {formatCurrency(previousTotal || 0)}
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
    </>
  );
};

export default function ProfitLossPage() {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Comparative State
  const [showComparative, setShowComparative] = useState(false);
  const [comparativeStartDate, setComparativeStartDate] = useState(
    new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0]
  );
  const [comparativeEndDate, setComparativeEndDate] = useState(
    new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0]
  );

  const {
    data: report,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: [
      "profit-loss",
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
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
  });

  const netIncomeChange = report
    ? report.netIncome - (report.previousNetIncome || 0)
    : 0;
  const netIncomePercent =
    report && report.previousNetIncome && report.previousNetIncome !== 0
      ? (netIncomeChange / Math.abs(report.previousNetIncome)) * 100
      : 0;

  const formatPercentage = (val: number) => {
    if (isNaN(val)) return "-";
    return `${val.toFixed(1)}%`;
  };

  const handleExportCSV = () => {
    if (!report) return;

    const flatten = (nodes: ReportAccountLine[], type: string): any[] => {
      let rows: any[] = [];
      for (const node of nodes) {
        rows.push({
          Type: type,
          Code: node.code,
          Account: node.name,
          Amount: node.amount,
          Previous: node.previousAmount || 0,
          Change: node.change || 0,
          ChangePercent: node.changePercentage ? node.changePercentage.toFixed(1) + "%" : "0%",
        });
        if (node.children) {
          rows = rows.concat(flatten(node.children, type));
        }
      }
      return rows;
    };

    const data = [
      ...flatten(report.revenue, "Revenue"),
      ...flatten(report.expenses, "Expense"),
      { Type: "Total", Account: "Net Income", Amount: report.netIncome, Previous: report.previousNetIncome || 0, Change: netIncomeChange, ChangePercent: netIncomePercent.toFixed(1) + "%" }
    ];

    downloadCSV(data, `profit-loss-${startDate}-${endDate}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">Profit and Loss</h1>
          <div className="flex items-center gap-4">
            <ExportButton
              onExportCSV={handleExportCSV}
              isLoading={loading}
              reportCode="PROFIT_LOSS"
              reportInput={{
                startDate,
                endDate,
                comparativeStartDate: showComparative ? comparativeStartDate : undefined,
                comparativeEndDate: showComparative ? comparativeEndDate : undefined,
              }}
              reportTitle="Profit & Loss Statement"
            />
            <Button onClick={() => refetch()} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Run Report"
              )}
            </Button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">From:</span>
            <CustomInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <CustomInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            <Label htmlFor="comparative">Compare</Label>
          </div>

          {showComparative && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Comp. From:
                </span>
                <CustomInput
                  type="date"
                  value={comparativeStartDate}
                  onChange={(e) => setComparativeStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Comp. To:
                </span>
                <CustomInput
                  type="date"
                  value={comparativeEndDate}
                  onChange={(e) => setComparativeEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Income Statement
            </CardTitle>
            <p className="text-center text-muted-foreground">
              For the period {formatDate(startDate)} to {formatDate(endDate)}
              {showComparative &&
                ` compared to ${formatDate(
                  comparativeStartDate
                )} to ${formatDate(comparativeEndDate)}`}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Account</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  {showComparative && (
                    <>
                      <TableHead className="text-right text-muted-foreground">
                        Previous
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Change
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        %
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <ReportSection
                  title="Revenue"
                  data={report.revenue}
                  total={report.totalRevenue}
                  totalLabel="Total Revenue"
                  previousTotal={report.previousTotalRevenue}
                  showComparative={showComparative}
                />

                <ReportSection
                  title="Expenses"
                  data={report.expenses}
                  total={report.totalExpenses}
                  totalLabel="Total Expenses"
                  previousTotal={report.previousTotalExpenses}
                  showComparative={showComparative}
                />

                <TableRow className="bg-muted font-bold text-lg border-t-4 border-double border-black">
                  <TableCell>Net Income</TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      report.netIncome >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(report.netIncome)}
                  </TableCell>
                  {showComparative && (
                    <>
                      <TableCell className="text-right text-muted-foreground text-base">
                        {formatCurrency(report.previousNetIncome || 0)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-base">
                        {formatCurrency(netIncomeChange)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-base",
                          netIncomePercent < 0
                            ? "text-red-600"
                            : "text-green-600"
                        )}
                      >
                        {formatPercentage(netIncomePercent)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
