"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { getBalanceSheet } from "../actions";
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
import { ReportAccountLine } from "../actions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BalanceSheetPage() {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Comparative State
  const [showComparative, setShowComparative] = useState(false);
  const [comparativeDate, setComparativeDate] = useState(
    new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split("T")[0]
  );

  const {
    data: report,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: [
      "balance-sheet",
      asOfDate,
      showComparative ? comparativeDate : null,
    ],
    queryFn: async () => {
      const res = await getBalanceSheet(
        asOfDate,
        showComparative ? comparativeDate : undefined
      );
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
  });

  // Helper to render total line
  const renderTotalLine = (
    label: string,
    current: number,
    previous?: number
  ) => {
    const change = current - (previous || 0);
    const percent =
      previous && previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    const formatPercentage = (val: number) => {
      if (isNaN(val)) return "-";
      return `${val.toFixed(1)}%`;
    };

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">Balance Sheet</h1>
          <div className="flex items-center gap-4">
            <ExportButton
              onExportCSV={() => {
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
                  ...flatten(report.assets, "Asset"),
                  ...flatten(report.liabilities, "Liability"),
                  ...flatten(report.equity, "Equity"),
                  { Type: "Total", Account: "Total Liabilities and Equity", Amount: report.totalLiabilitiesAndEquity }
                ];
                downloadCSV(data, `balance-sheet-${asOfDate}`);
              }}
              isLoading={loading}
              reportCode="BALANCE_SHEET"
              reportInput={{
                date: asOfDate,
                comparativeDate: showComparative ? comparativeDate : undefined,
              }}
              reportTitle="Balance Sheet"
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">As Of:</span>
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
            <Label htmlFor="comparative">Compare</Label>
          </div>

          {showComparative && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Comp. Date:
              </span>
              <CustomInput
                type="date"
                value={comparativeDate}
                onChange={(e) => setComparativeDate(e.target.value)}
                className="w-auto"
              />
            </div>
          )}
        </div>
      </div>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Statement of Financial Position
            </CardTitle>
            <p className="text-center text-muted-foreground">
              As of {formatDate(asOfDate)}
              {showComparative && ` compared to ${formatDate(comparativeDate)}`}
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
                {/* Assets */}
                <TableRow className="bg-muted hover:bg-muted">
                  <TableCell
                    colSpan={showComparative ? 5 : 2}
                    className="font-bold text-lg"
                  >
                    Assets
                  </TableCell>
                </TableRow>
                {report.assets.map((node) => (
                  <AccountTreeRow
                    key={node.accountId}
                    node={node}
                    showComparative={showComparative}
                  />
                ))}
                {renderTotalLine(
                  "Total Assets",
                  report.totalAssets,
                  report.previousTotalAssets
                )}

                {/* Liabilities */}
                <TableRow className="bg-muted hover:bg-muted">
                  <TableCell
                    colSpan={showComparative ? 5 : 2}
                    className="font-bold text-lg"
                  >
                    Liabilities
                  </TableCell>
                </TableRow>
                {report.liabilities.map((node) => (
                  <AccountTreeRow
                    key={node.accountId}
                    node={node}
                    showComparative={showComparative}
                  />
                ))}
                {renderTotalLine(
                  "Total Liabilities",
                  report.totalLiabilities,
                  report.previousTotalLiabilities
                )}

                {/* Equity */}
                <TableRow className="bg-muted hover:bg-muted">
                  <TableCell
                    colSpan={showComparative ? 5 : 2}
                    className="font-bold text-lg"
                  >
                    Equity
                  </TableCell>
                </TableRow>
                {report.equity.map((node) => (
                  <AccountTreeRow
                    key={node.accountId}
                    node={node}
                    showComparative={showComparative}
                  />
                ))}
                {renderTotalLine(
                  "Total Equity",
                  report.totalEquity,
                  report.previousTotalEquity
                )}

                {/* Total Liabilities and Equity */}
                <TableRow className="bg-muted font-bold text-lg border-t-4 border-double border-black">
                  <TableCell>Total Liabilities and Equity</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalLiabilitiesAndEquity)}
                  </TableCell>
                  {showComparative && (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(
                          report.previousTotalLiabilitiesAndEquity || 0
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(
                          report.totalLiabilitiesAndEquity -
                          (report.previousTotalLiabilitiesAndEquity || 0)
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          report.previousTotalLiabilitiesAndEquity &&
                            report.previousTotalLiabilitiesAndEquity !== 0
                            ? (report.totalLiabilitiesAndEquity -
                              report.previousTotalLiabilitiesAndEquity) /
                              Math.abs(
                                report.previousTotalLiabilitiesAndEquity
                              ) <
                              0
                              ? "text-red-500"
                              : "text-green-500"
                            : ""
                        )}
                      >
                        {report.previousTotalLiabilitiesAndEquity &&
                          report.previousTotalLiabilitiesAndEquity !== 0
                          ? (
                            ((report.totalLiabilitiesAndEquity -
                              report.previousTotalLiabilitiesAndEquity) /
                              Math.abs(
                                report.previousTotalLiabilitiesAndEquity
                              )) *
                            100
                          ).toFixed(1) + "%"
                          : "-"}
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
