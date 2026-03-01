export const dynamic = "force-dynamic";

import { getProductionIssue } from "../actions";
import { ProductionIssueForm } from "../_components/production-issue-form";
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
    const [issueResult, products, ordersResult] = await Promise.all([
        getProductionIssue(id),
        getProducts(),
        getProductionOrders(1, 100),
    ]);

    if (!issueResult) {
        notFound();
    }

    return (
        <ProductionIssueForm
            issue={issueResult as unknown as SuperJSONResult}
            products={products.products as unknown as SuperJSONResult}
            orders={ordersResult.data as unknown as SuperJSONResult}
        />
    );
}
