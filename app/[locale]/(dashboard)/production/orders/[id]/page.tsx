export const dynamic = "force-dynamic";

import { getProductionOrder } from "../actions";
import { ProductionOrderForm } from "../_components/production-order-form";
import { notFound } from "next/navigation";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getBOMs } from "@/app/[locale]/(dashboard)/production/boms/actions";
import { SuperJSONResult } from "superjson";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [orderResult, products, bomsResult] = await Promise.all([
        getProductionOrder(id),
        getProducts(),
        getBOMs(1, 100),
    ]);

    if (!orderResult) {
        notFound();
    }

    return (
        <ProductionOrderForm
            order={orderResult as unknown as SuperJSONResult}
            products={products.products as unknown as SuperJSONResult}
            boms={bomsResult.data as unknown as SuperJSONResult}
            readonly
        />
    );
}
