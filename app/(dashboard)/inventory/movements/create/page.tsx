"use client";

import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../../products/actions";
import { getWarehouses } from "../../warehouses/actions";
import { BatchMovementForm } from "../_components/batch-movement-form";
import { SuperJSON } from "@/lib/superjson";
import { Product, Warehouse } from "@/prisma/generated/prisma/browser";

export default function CreateMovementPage() {
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => getProducts(),
  });

  const { data: warehousesData, isLoading: isWarehousesLoading } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: () => getWarehouses(),
  });

  if (isProductsLoading || isWarehousesLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const products = productsData?.products
    ? SuperJSON.deserialize<Product[]>(productsData.products)
    : [];
  const warehouses = warehousesData?.warehouses
    ? SuperJSON.deserialize<Warehouse[]>(warehousesData.warehouses)
    : [];

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

      <BatchMovementForm
        products={formattedProducts}
        warehouses={warehouses}
      />
    </div>
  );
}
