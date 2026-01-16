"use client";

import { useEffect, useState, useMemo } from "react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getTrialBalance } from "./actions";
import { Loader2, RefreshCw, ChevronRight, ChevronDown } from "lucide-react";
import { TrialBalanceItem } from "../types";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

export default function TrialBalancePage() {
  const formatCurrency = useFormatCurrency();
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<TrialBalanceItem[]>([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTrialBalance(date);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotals({
          debit: res.data.totalDebit,
          credit: res.data.totalCredit,
        });

        // Default expand all
        const initialExpanded: Record<string, boolean> = {};
        res.data.items.forEach((item) => {
          if (item.hasChildren) {
            initialExpanded[item.accountId] = true;
          }
        });
        setExpanded(initialExpanded);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleItems = useMemo(() => {
    const result: TrialBalanceItem[] = [];

    const visibilityMap = new Map<string, boolean>(); // accountId -> isVisible

    for (const item of items) {
      // Hide Level 0
      if (item.level === 0) {
        visibilityMap.set(item.accountId, true); // Treated as visible for inheritance
        continue;
      }

      let isVisible = false;

      if (!item.parentId) {
        // Should not happen for level > 0 usually, but if it does, it's a root
        isVisible = true;
      } else {
        const parentVisible = visibilityMap.get(item.parentId);

        if (item.level === 1) {
          isVisible = !!parentVisible;
        } else {
          const parentExpanded = expanded[item.parentId];
          isVisible = !!(parentVisible && parentExpanded);
        }
      }

      visibilityMap.set(item.accountId, isVisible);

      if (isVisible) {
        result.push(item);
      }
    }

    return result;
  }, [items, expanded]);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Trial Balance" />
        <PageListActions>
          <Button size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListActions>
        <div className="flex flex-col space-y-2 max-w-xs">
          <Label htmlFor="date">As of Date</Label>
          <CustomInput
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </PageListActions>
      <PageListContent>
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[100px] rounded-tl-lg">Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right rounded-tr-lg">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No accounts found.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {visibleItems.map((item) => (
                  <TableRow
                    key={item.accountId}
                    className={item.hasChildren ? "bg-muted/30" : ""}
                  >
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>
                      <div
                        style={{
                          paddingLeft: `${(item.level - 1) * 1.5}rem`,
                        }}
                        className={`flex items-center gap-2 ${
                          item.hasChildren ? "font-bold" : ""
                        }`}
                      >
                        {item.hasChildren && (
                          <button
                            onClick={() => toggleExpand(item.accountId)}
                            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                          >
                            {expanded[item.accountId] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {!item.hasChildren && <span className="w-4" />}{" "}
                        {/* Spacer for alignment */}
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell
                      className={`text-right ${
                        item.hasChildren ? "font-bold" : ""
                      }`}
                    >
                      {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        item.hasChildren ? "font-bold" : ""
                      }`}
                    >
                      {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.debit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.credit)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </PageListContent>
    </PageListLayout>
  );
}
