"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProfitAndLoss,
  ProfitLossReport,
  ReportAccountLine,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountTreeRow } from "../_components/account-tree-row";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfitAndLoss(
        startDate,
        endDate,
        showComparative ? comparativeStartDate : undefined,
        showComparative ? comparativeEndDate : undefined
      );
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        console.error("Failed to fetch report:", res.error);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    showComparative,
    comparativeStartDate,
    comparativeEndDate,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">Profit and Loss</h1>
          <div className="flex items-center gap-4">
            <Button onClick={fetchReport} disabled={loading}>
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <Input
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
                <Input
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
                <Input
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
