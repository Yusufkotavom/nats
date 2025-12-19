"use client";

import { useState, useEffect } from "react";
import { getBalanceSheet, BalanceSheetReport } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountTreeRow } from "../_components/account-tree-row";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getBalanceSheet(asOfDate);
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Balance Sheet</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">As Of:</span>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button onClick={fetchReport} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Run Report"
            )}
          </Button>
        </div>
      </div>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Statement of Financial Position
            </CardTitle>
            <p className="text-center text-muted-foreground">
              As of {asOfDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Assets */}
            <div>
              <h3 className="text-xl font-bold mb-2 bg-muted p-2 rounded">
                Assets
              </h3>
              <div className="pl-4">
                {report.assets.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} />
                ))}
                <div className="flex justify-between py-2 mt-4 font-bold border-t-2 border-black text-lg">
                  <span>Total Assets</span>
                  <span>{formatCurrency(report.totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div>
              <h3 className="text-xl font-bold mb-2 bg-muted p-2 rounded">
                Liabilities
              </h3>
              <div className="pl-4">
                {report.liabilities.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} />
                ))}
                <div className="flex justify-between py-2 mt-4 font-bold border-t border-black">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(report.totalLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="text-xl font-bold mb-2 bg-muted p-2 rounded">
                Equity
              </h3>
              <div className="pl-4">
                {report.equity.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} />
                ))}
                <div className="flex justify-between py-2 mt-4 font-bold border-t border-black">
                  <span>Total Equity</span>
                  <span>{formatCurrency(report.totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities and Equity */}
            <div className="flex justify-between p-4 bg-muted/50 rounded-md text-lg font-bold border-t-4 border-double border-black">
              <span>Total Liabilities and Equity</span>
              <span>{formatCurrency(report.totalLiabilitiesAndEquity)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
