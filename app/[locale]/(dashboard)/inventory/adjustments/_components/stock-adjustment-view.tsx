"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { getWarehouseStockSnapshot, postStockAdjustment } from "../actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Warehouse = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  averageCost: number;
  cost: number;
  baseUnit: { symbol: string } | null;
};

type AdjustmentRow = {
  productId: string;
  actualStock: number;
  note: string;
};

export function StockAdjustmentView({
  warehouses,
  products,
}: {
  warehouses: Warehouse[];
  products: Product[];
}) {
  const t = useTranslations("Inventory");
  const { toast } = useToast();
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id || "");
  const [search, setSearch] = useState("");
  const [headerNote, setHeaderNote] = useState("");
  const [rows, setRows] = useState<Record<string, AdjustmentRow>>({});

  const { data: stockSnapshotRaw } = useQuery({
    queryKey: ["warehouse-stock-snapshot", warehouseId],
    queryFn: () => getWarehouseStockSnapshot(warehouseId),
    enabled: !!warehouseId,
  });

  const stockSnapshot = useMemo(() => {
    if (!stockSnapshotRaw) return new Map<string, { currentStock: number; unitCost: number }>();
    const parsed = SuperJSON.deserialize<Array<{ productId: string; currentStock: number; unitCost: number }>>(
      stockSnapshotRaw as SuperJSONResult,
    );
    return new Map(parsed.map((row) => [row.productId, { currentStock: row.currentStock, unitCost: row.unitCost }]));
  }, [stockSnapshotRaw]);

  useEffect(() => {
    if (!products.length) return;
    const nextRows: Record<string, AdjustmentRow> = {};
    for (const product of products) {
      const currentStock = stockSnapshot.get(product.id)?.currentStock || 0;
      nextRows[product.id] = {
        productId: product.id,
        actualStock: currentStock,
        note: "",
      };
    }
    setRows(nextRows);
  }, [products, stockSnapshot]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadLines = Object.values(rows)
        .map((row) => {
          const currentStock = stockSnapshot.get(row.productId)?.currentStock || 0;
          return {
            productId: row.productId,
            actualStock: Number(row.actualStock || 0),
            note: row.note || undefined,
            diff: Number(row.actualStock || 0) - currentStock,
          };
        })
        .filter((row) => row.diff !== 0)
        .map(({ productId, actualStock, note }) => ({ productId, actualStock, note }));

      if (!warehouseId) {
        throw new Error("Warehouse wajib dipilih");
      }

      if (payloadLines.length === 0) {
        throw new Error("Tidak ada selisih stok untuk diposting");
      }

      const result = await postStockAdjustment({
        warehouseId,
        note: headerNote || undefined,
        lines: payloadLines,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to post stock adjustment");
      }

      return result.data;
    },
    onSuccess: (data) => {
      toast({
        title: t("adjustments"),
        description: `Movement ${data?.movementId} | Journal ${data?.journalEntryId || "-"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to post adjustment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateRow = (productId: string, patch: Partial<AdjustmentRow>) => {
    setRows((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        ...patch,
      },
    }));
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("adjustments")} />
        <PageListActions>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !warehouseId}>
            {mutation.isPending ? "Posting..." : "Post Adjustment"}
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="min-w-[260px]">
          <Label>Warehouse</Label>
          <SearchableSelect
            value={warehouseId}
            onValueChange={setWarehouseId}
            options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
            placeholder="Pilih Warehouse"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder="Cari produk / SKU"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </PageListFilter>

      <PageListContent>
        <div className="space-y-4">
          <CustomTextarea
            label="Adjustment Note"
            value={headerNote}
            onChange={(event) => setHeaderNote(event.target.value)}
            placeholder="Catatan umum adjustment"
          />

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">Current</th>
                  <th className="p-2 text-right">Actual</th>
                  <th className="p-2 text-right">Diff</th>
                  <th className="p-2 text-right">Avg Cost</th>
                  <th className="p-2 text-right">Impact</th>
                  <th className="p-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const currentStock = stockSnapshot.get(product.id)?.currentStock || 0;
                  const row = rows[product.id] || { productId: product.id, actualStock: currentStock, note: "" };
                  const actualStock = Number(row.actualStock || 0);
                  const diff = actualStock - currentStock;
                  const unitCost = stockSnapshot.get(product.id)?.unitCost || product.averageCost || product.cost || 0;
                  const impact = Math.abs(diff) * unitCost;
                  return (
                    <tr key={product.id} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                      </td>
                      <td className="p-2 text-right">{currentStock} {product.baseUnit?.symbol || ""}</td>
                      <td className="p-2 text-right w-[120px]">
                        <CustomInput
                          type="number"
                          value={String(actualStock)}
                          onChange={(event) => updateRow(product.id, { actualStock: Number(event.target.value || 0) })}
                        />
                      </td>
                      <td className={`p-2 text-right font-medium ${diff < 0 ? "text-red-600" : diff > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="p-2 text-right">{unitCost.toLocaleString("id-ID")}</td>
                      <td className="p-2 text-right">{impact.toLocaleString("id-ID")}</td>
                      <td className="p-2 min-w-[220px]">
                        <CustomInput
                          value={row.note}
                          onChange={(event) => updateRow(product.id, { note: event.target.value })}
                          placeholder="Keterangan"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
