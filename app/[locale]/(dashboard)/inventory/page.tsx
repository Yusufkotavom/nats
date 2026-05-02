"use client";
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  Box,
  DollarSign,
  Loader2,
} from "lucide-react";
import { getInventoryDashboardMetrics } from "./actions";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useQuery } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  Inventory,
  InventoryMovement,
  InventoryMovementDetail,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { SuperJSONResult } from "superjson";

type InventoryWithRelations = Inventory & {
  product: Product;
  warehouse: Warehouse;
};

type MovementDetailWithRelations = InventoryMovementDetail & {
  product: Product;
  inventoryMovement: InventoryMovement & {
    fromWarehouse: Warehouse | null;
    toWarehouse: Warehouse | null;
  };
};

import { useTranslations } from "next-intl";

export default function InventoryDashboardPage() {
  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["inventory-dashboard-metrics"],
    queryFn: async () => {
      const data = await getInventoryDashboardMetrics();
      return {
        ...data,
        lowStockItems: SuperJSON.deserialize<InventoryWithRelations[]>(
          data.lowStockItems as unknown as SuperJSONResult,
        ),
        recentMovements: SuperJSON.deserialize<MovementDetailWithRelations[]>(
          data.recentMovements as unknown as SuperJSONResult,
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
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <h2 className="text-2xl font-bold tracking-tight">
        {t("inventory_overview")}
      </h2>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_products")}
            </CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{t("active_skus")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_valuation")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("based_on_average_cost")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("low_stock_alerts")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              {t("items_below_reorder_point")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("recent_movements")}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              {t("movements_last_24h")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t("low_stock_items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead className="text-right">{t("quantity")}</TableHead>
                  <TableHead className="text-right">
                    {t("reorder_point")}
                  </TableHead>
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
            <CardTitle>{t("recent_movements")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-right">{t("quantity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(recentMovements) &&
                  recentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">
                        {movement.product?.name}
                      </TableCell>
                      <TableCell>{movement.inventoryMovement.type}</TableCell>
                      <TableCell>{formatDate(movement.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {movement.inventoryMovement.type === "IN" ? "+" : "-"}
                        {movement.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                {recentMovements.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground h-24"
                    >
                      {t("no_recent_movements")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
