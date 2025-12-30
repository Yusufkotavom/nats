"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Activity, AlertTriangle, Box, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { getInventoryDashboardMetrics } from "./actions";
import { useFormatCurrency } from "@/hooks/use-format-currency";

type DashboardMetrics = Awaited<
  ReturnType<typeof getInventoryDashboardMetrics>
>;

interface Movement {
  id: string;
  type: string;
  createdAt: string | Date;
  product?: { name: string };
  quantity?: number;
}

export default function InventoryDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    getInventoryDashboardMetrics().then(setMetrics);
  }, []);

  if (!metrics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  const { totalProducts, totalValue, lowStockItems, recentMovements } = metrics;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h2 className="text-2xl font-bold tracking-tight">Inventory Overview</h2>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active SKUs in catalog
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Valuation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on average cost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Items below reorder point
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Movements
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              In the last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentMovements as unknown as Movement[]).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {movement.product?.name}
                    </TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell
                      className={
                        (movement.quantity || 0) < 0
                          ? "text-red-500"
                          : "text-green-500"
                      }
                    >
                      {movement.quantity}
                    </TableCell>
                    <TableCell>
                      {format(new Date(movement.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.warehouse.name}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-red-500">
                    {item.quantity} / {item.reorderPoint}
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No items are currently low on stock.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
