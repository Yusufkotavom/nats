"use client";
export const dynamic = "force-dynamic";

import { useQuery } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { getStockAdjustmentFormData } from "./actions";
import { StockAdjustmentView } from "./_components/stock-adjustment-view";

export default function StockAdjustmentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-adjustment-form-data"],
    queryFn: getStockAdjustmentFormData,
  });

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const parsed = SuperJSON.deserialize<{
    warehouses: { id: string; name: string }[];
    products: {
      id: string;
      name: string;
      sku: string;
      averageCost: number;
      cost: number;
      baseUnit: { symbol: string } | null;
    }[];
  }>(data as SuperJSONResult);

  return <StockAdjustmentView warehouses={parsed.warehouses} products={parsed.products} />;
}
