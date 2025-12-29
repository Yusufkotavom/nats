import { getProducts } from "../../products/actions";
import { getWarehouses } from "../../warehouses/actions";
import { BatchMovementForm } from "../_components/batch-movement-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CreateMovementPage() {
  const { products } = await getProducts();
  const warehouses = await getWarehouses();

  // Convert Decimals to numbers for client component
  const formattedProducts = products.map((p) => ({
    ...p,
    price: Number(p.price),
    cost: Number(p.cost),
    averageCost: Number(p.averageCost),
    purchaseConversionFactor: Number(p.purchaseConversionFactor),
    salesConversionFactor: Number(p.salesConversionFactor),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Inventory Movement
        </h2>
      </div>

      <BatchMovementForm products={formattedProducts} warehouses={warehouses} />
    </div>
  );
}
