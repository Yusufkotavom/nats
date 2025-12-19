"use client";

import { useState, useEffect } from "react";
import { getCashFlowStatement, CashFlowReport } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getCashFlowStatement(startDate, endDate);
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
        <h1 className="text-lg font-bold">Statement of Cash Flows</h1>
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
              Statement of Cash Flows
            </CardTitle>
            <p className="text-center text-muted-foreground">
              For the period {startDate} to {endDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Operating Activities */}
            <div>
              <h3 className="text-lg font-bold mb-2 uppercase text-muted-foreground">
                Operating Activities
              </h3>
              <div className="space-y-2 pl-4">
                {report.operatingActivities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-border/50"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold border-t border-black mt-2">
                  <span>Net Cash Provided by Operating Activities</span>
                  <span>
                    {formatCurrency(report.netCashProvidedByOperating)}
                  </span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <h3 className="text-lg font-bold mb-2 uppercase text-muted-foreground">
                Investing Activities
              </h3>
              <div className="space-y-2 pl-4">
                {report.investingActivities.length === 0 && (
                  <div className="text-muted-foreground italic text-sm">
                    No investing activities for this period.
                  </div>
                )}
                {report.investingActivities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-border/50"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold border-t border-black mt-2">
                  <span>Net Cash Provided by Investing Activities</span>
                  <span>
                    {formatCurrency(report.netCashProvidedByInvesting)}
                  </span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <h3 className="text-lg font-bold mb-2 uppercase text-muted-foreground">
                Financing Activities
              </h3>
              <div className="space-y-2 pl-4">
                {report.financingActivities.length === 0 && (
                  <div className="text-muted-foreground italic text-sm">
                    No financing activities for this period.
                  </div>
                )}
                {report.financingActivities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-border/50"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold border-t border-black mt-2">
                  <span>Net Cash Provided by Financing Activities</span>
                  <span>
                    {formatCurrency(report.netCashProvidedByFinancing)}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 pt-4 border-t-2 border-black">
              <div className="flex justify-between font-bold text-lg">
                <span>Net Increase (Decrease) in Cash</span>
                <span>{formatCurrency(report.netIncreaseInCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash at Beginning of Period</span>
                <span>{formatCurrency(report.cashAtBeginning)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
                <span>Cash at End of Period</span>
                <span>{formatCurrency(report.cashAtEnd)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
