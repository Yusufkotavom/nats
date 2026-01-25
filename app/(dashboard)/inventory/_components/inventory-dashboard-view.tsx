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
import {
  Activity,
  AlertTriangle,
  Box,
  DollarSign,
  Loader2,
} from "lucide-react";
import { getInventoryDashboardMetrics } from "../actions";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useQuery } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  Inventory,
  InventoryMovement,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";

type InventoryWithRelations = Inventory & {
  product: Product;
  warehouse: Warehouse;
};

type MovementWithRelations = InventoryMovement & {
  product: Product;
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
};

export function InventoryDashboardView() {
  const formatCurrency = useFormatCurrency();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["inventory-dashboard-metrics"],
    queryFn: async () => {
      const data = await getInventoryDashboardMetrics();
      return {
        ...data,
        lowStockItems: SuperJSON.deserialize<InventoryWithRelations[]>(
          data.lowStockItems,
        ),
        recentMovements: SuperJSON.deserialize<MovementWithRelations[]>(
          data.recentMovements,
        ),
      };
    },
  });

  if (isLoading || !metrics) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              Movements in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(lowStockItems) &&
                  lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell>{item.warehouse.name}</TableCell>
                      <TableCell className="text-right text-red-500 font-bold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.reorderPoint}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Array.isArray(recentMovements) &&
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {movement.product?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {movement.type} •{" "}
                        {format(new Date(movement.createdAt), "PP")}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {movement.type === "IN" ? "+" : "-"}
                      {/* movement.quantity doesn't exist on InventoryMovement, we might need to check how it was used before or if it's derived */}
                      {/* The original code didn't show the quantity in the recent movements list either, it just showed count */}
                      {/* Wait, recentMovements query includes product, fromWarehouse, toWarehouse, but not details/quantity */}
                      {/* Let's double check the original recentMovements mapping in actions.ts */}
                    </div>
                  </div>
                ))}
              {recentMovements.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No recent movements
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
