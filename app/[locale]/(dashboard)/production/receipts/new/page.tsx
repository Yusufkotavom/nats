export const dynamic = "force-dynamic";

import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getProductionOrders } from "@/app/[locale]/(dashboard)/production/orders/actions";
import { ProductionReceiptForm } from "../_components/production-receipt-form";
import { SuperJSONResult } from "superjson";

export default async function Page() {
    const [products, ordersResult] = await Promise.all([
        getProducts(),
        getProductionOrders(1, 100),
    ]);

    return (
        <ProductionReceiptForm
            products={products.products as unknown as SuperJSONResult}
            orders={ordersResult.data as unknown as SuperJSONResult}
        />
    );
}
