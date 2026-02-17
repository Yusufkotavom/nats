"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProductsByIds } from "../actions";
import { ProductLabel } from "../_components/product-label";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { SuperJSON } from "@/lib/superjson";
import { calculateDiscountedPrice } from "@/modules/inventory/utils/discount-calculator";
import { Decimal } from "decimal.js";

interface ProductWithDiscounts {
    id: string;
    name: string;
    sku: string;
    price: Decimal;
    discounts: any[];
    [key: string]: any;
}

function PrintPageContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get("ids");
    const ids = idsParam ? idsParam.split(",") : [];

    const { data: products = [], isLoading } = useQuery({
        queryKey: ["products-batch", ids],
        queryFn: async () => {
            if (ids.length === 0) return [];
            const result = await getProductsByIds(ids);
            if (!result) return [];
            // Ensure result is correct type for SuperJSON
            return SuperJSON.deserialize(result as any) as ProductWithDiscounts[];
        },
        enabled: ids.length > 0,
    });

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (products.length === 0) {
        return <div className="p-8 text-center">No products selected.</div>;
    }

    return (
        <div className="min-h-screen bg-white text-black p-8">
            <div className="print:hidden flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Print Labels ({products.length})</h1>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>

            <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 0;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:block">
                {products.map((product) => {
                    const price = new Decimal(product.price);
                    let finalPrice = price;
                    if (product.discounts && Array.isArray(product.discounts)) {
                        finalPrice = calculateDiscountedPrice(price, product.discounts);
                    }

                    return (
                        <div key={product.id} className="break-inside-avoid mb-4 print:inline-block print:m-1">
                            <ProductLabel product={product} discountedPrice={finalPrice} />
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

export default function PrintLabelsPage() {
    return <PrintPageContent />
}
