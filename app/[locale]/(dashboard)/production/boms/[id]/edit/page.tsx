export const dynamic = "force-dynamic";

import { getBOM } from "../../actions";
import { BOMForm } from "../../_components/bom-form";
import { notFound } from "next/navigation";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { SuperJSONResult } from "superjson";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [bomResult, products] = await Promise.all([
        getBOM(id),
        getProducts(),
    ]);

    if (!bomResult) {
        notFound();
    }

    return (
        <BOMForm
            bom={bomResult as unknown as SuperJSONResult}
            products={products.products as unknown as SuperJSONResult}
        />
    );
}
