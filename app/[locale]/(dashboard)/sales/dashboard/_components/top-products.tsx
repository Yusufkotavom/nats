"use client";

import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Package } from "lucide-react";

type TopProductsProps = {
    data: {
        id: string;
        name: string;
        sku: string;
        quantity: number;
        amount: number;
    }[];
};

export function TopProducts({ data }: TopProductsProps) {
    const formatCurrency = useFormatCurrency();

    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No product data available
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {data.map((product) => (
                <div key={product.id} className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {product.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {product.sku || "No SKU"} &middot; {product.quantity} sold
                        </p>
                    </div>
                    <div className="ml-auto font-medium">
                        {formatCurrency(product.amount)}
                    </div>
                </div>
            ))}
        </div>
    );
}
