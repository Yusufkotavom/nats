"use client";

import { useState, useEffect } from "react";
import { getStatementOfChangesInEquity, EquityChangeReport } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default function EquityPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState<EquityChangeReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getStatementOfChangesInEquity(startDate, endDate);
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
        <h1 className="text-lg font-bold">Statement of Changes in Equity</h1>
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
              Statement of Changes in Equity
            </CardTitle>
            <p className="text-center text-muted-foreground">
              For the period {startDate} to {endDate}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Account</TableHead>
                  <TableHead className="text-right">
                    Balance Beginning
                  </TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                  <TableHead className="text-right">Additions</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right font-bold">
                    Balance Ending
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.balanceBeginning)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.netIncome)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.additions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(item.balanceEnding)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold border-t-2 border-black">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalBeginning)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalNetIncome)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalAdditions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalDeductions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(report.totalEnding)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
