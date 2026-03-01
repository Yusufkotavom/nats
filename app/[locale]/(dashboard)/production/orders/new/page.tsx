export const dynamic = "force-dynamic";

import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getBOMs } from "@/app/[locale]/(dashboard)/production/boms/actions";
import { ProductionOrderForm } from "../_components/production-order-form";
import { SuperJSONResult } from "superjson";

export default async function Page() {
    const [products, bomsResult] = await Promise.all([
        getProducts(),
        getBOMs(1, 100),
    ]);

    return (
        <ProductionOrderForm
            products={products.products as unknown as SuperJSONResult}
            boms={bomsResult.data as unknown as SuperJSONResult}
        />
    );
}
