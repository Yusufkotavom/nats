export const dynamic = "force-dynamic";

import { getProductionReceipt } from "../actions";
import { ProductionReceiptForm } from "../_components/production-receipt-form";
import { notFound } from "next/navigation";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getProductionOrders } from "@/app/[locale]/(dashboard)/production/orders/actions";
import { SuperJSONResult } from "superjson";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [receiptResult, products, ordersResult] = await Promise.all([
        getProductionReceipt(id),
        getProducts(),
        getProductionOrders(1, 100),
    ]);

    if (!receiptResult) {
        notFound();
    }

    return (
        <ProductionReceiptForm
            receipt={receiptResult as unknown as SuperJSONResult}
            products={products.products as unknown as SuperJSONResult}
            orders={ordersResult.data as unknown as SuperJSONResult}
        />
    );
}
