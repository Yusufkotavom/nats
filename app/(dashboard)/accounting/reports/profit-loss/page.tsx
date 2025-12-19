"use client";

import { useState, useEffect } from "react";
import { getProfitAndLoss, ProfitLossReport } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountTreeRow } from "../_components/account-tree-row";
import { Loader2 } from "lucide-react";

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getProfitAndLoss(startDate, endDate);
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
        <h1 className="text-lg font-bold">Profit and Loss</h1>
        <div className="flex items-center gap-4">
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
              Income Statement
            </CardTitle>
            <p className="text-center text-muted-foreground">
              For the period {startDate} to {endDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Revenue</h3>
              <div className="border rounded-md p-4">
                {report.revenue.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} />
                ))}
                <div className="flex justify-between py-2 mt-2 font-bold border-t">
                  <span>Total Revenue</span>
                  <span>
                    {report.totalRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Expenses</h3>
              <div className="border rounded-md p-4">
                {report.expenses.map((node) => (
                  <AccountTreeRow key={node.accountId} node={node} />
                ))}
                <div className="flex justify-between py-2 mt-2 font-bold border-t">
                  <span>Total Expenses</span>
                  <span>
                    {report.totalExpenses.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between p-2 bg-muted/50 rounded-md text-lg font-bold">
              <span>Net Income</span>
              <span
                className={
                  report.netIncome >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {report.netIncome.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
