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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type AdjustmentChange = {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  currentStock: number;
  actualStock: number;
  diff: number;
  unitCost: number;
  lineImpact: number;
  note: string;
};

type AdjustmentSummary = {
  changes: AdjustmentChange[];
  increaseCount: number;
  decreaseCount: number;
  totalAbsoluteImpact: number;
};

export function buildAdjustmentSummary(
  products: Product[],
  rows: Record<string, AdjustmentRow>,
  stockSnapshot: Map<string, { currentStock: number; unitCost: number }>,
): AdjustmentSummary {
  const changes: AdjustmentChange[] = [];
  let increaseCount = 0;
  let decreaseCount = 0;
  let totalAbsoluteImpact = 0;

  for (const product of products) {
    const snapshot = stockSnapshot.get(product.id);
    const currentStock = snapshot?.currentStock || 0;
    const row = rows[product.id];
    const actualStock = Number(row?.actualStock ?? currentStock);
    const diff = actualStock - currentStock;
    if (diff === 0) continue;

    const unitCost = snapshot?.unitCost || product.averageCost || product.cost || 0;
    const lineImpact = Math.abs(diff) * unitCost;

    if (diff > 0) increaseCount += 1;
    else decreaseCount += 1;
    totalAbsoluteImpact += lineImpact;

    changes.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitSymbol: product.baseUnit?.symbol || "",
      currentStock,
      actualStock,
      diff,
      unitCost,
      lineImpact,
      note: row?.note || "",
    });
  }

  return { changes, increaseCount, decreaseCount, totalAbsoluteImpact };
}

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
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const adjustmentSummary = useMemo(
    () => buildAdjustmentSummary(products, rows, stockSnapshot),
    [products, rows, stockSnapshot],
  );

  const selectedWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === warehouseId)?.name || "-",
    [warehouses, warehouseId],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadLines = adjustmentSummary.changes.map((change) => ({
        productId: change.productId,
        actualStock: change.actualStock,
        note: change.note || undefined,
      }));

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
      setConfirmOpen(false);
      toast({
        title: t("adjustments"),
        description: `Movement ${data?.movementId} | Journal ${data?.journalEntryId || "-"}`,
      });
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast({
        title: "Failed to post adjustment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handlePostClick = () => {
    if (!warehouseId) {
      toast({
        title: "Warehouse wajib dipilih",
        variant: "destructive",
      });
      return;
    }
    if (adjustmentSummary.changes.length === 0) {
      toast({
        title: "Tidak ada selisih stok untuk diposting",
        variant: "destructive",
      });
      return;
    }
    setConfirmOpen(true);
  };

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
          <Button
            onClick={handlePostClick}
            disabled={mutation.isPending || !warehouseId}
          >
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

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!mutation.isPending) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent
          className="max-w-lg sm:max-w-lg"
          data-testid="confirm-post-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Post Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Periksa ringkasan perubahan stok di bawah sebelum memposting.
              Setelah diposting, inventory movement dan jurnal akuntansi akan
              dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-medium" data-testid="confirm-warehouse">
                  {selectedWarehouseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Baris berubah</span>
                <span className="font-medium" data-testid="confirm-changed-lines">
                  {adjustmentSummary.changes.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kenaikan / Penurunan</span>
                <span className="font-medium">
                  <span className="text-green-600" data-testid="confirm-increase-count">
                    +{adjustmentSummary.increaseCount}
                  </span>
                  {" / "}
                  <span className="text-red-600" data-testid="confirm-decrease-count">
                    -{adjustmentSummary.decreaseCount}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total dampak nilai</span>
                <span className="font-semibold" data-testid="confirm-total-impact">
                  {adjustmentSummary.totalAbsoluteImpact.toLocaleString("id-ID")}
                </span>
              </div>
              {headerNote && (
                <div className="pt-1 text-xs text-muted-foreground">
                  Catatan: <span className="text-foreground">{headerNote}</span>
                </div>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Produk</th>
                    <th className="p-2 text-right">Current</th>
                    <th className="p-2 text-right">Actual</th>
                    <th className="p-2 text-right">Diff</th>
                    <th className="p-2 text-right">Dampak</th>
                  </tr>
                </thead>
                <tbody data-testid="confirm-changes-list">
                  {adjustmentSummary.changes.map((change) => (
                    <tr key={change.productId} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{change.productName}</div>
                        <div className="text-[10px] text-muted-foreground">{change.sku}</div>
                      </td>
                      <td className="p-2 text-right">
                        {change.currentStock} {change.unitSymbol}
                      </td>
                      <td className="p-2 text-right">
                        {change.actualStock} {change.unitSymbol}
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${
                          change.diff < 0
                            ? "text-red-600"
                            : change.diff > 0
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {change.diff > 0 ? `+${change.diff}` : change.diff}
                      </td>
                      <td className="p-2 text-right">
                        {change.lineImpact.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={mutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              {mutation.isPending ? "Posting..." : "Post Sekarang"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageListLayout>
  );
}
