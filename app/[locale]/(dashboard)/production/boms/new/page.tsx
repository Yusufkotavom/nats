export const dynamic = "force-dynamic";

import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { BOMForm } from "../_components/bom-form";
import { SuperJSONResult } from "superjson";

export default async function Page() {
    const products = await getProducts();

    return (
        <BOMForm
            products={products.products as unknown as SuperJSONResult}
        />
    );
}
