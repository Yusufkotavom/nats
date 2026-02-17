"use client";

import Barcode from "react-barcode";
import { Product } from "@/prisma/generated/prisma/client"; // Or your product type
import { Decimal } from "decimal.js";
import { useFormatCurrency } from "@/hooks/use-format-currency";

interface ProductLabelProps {
    product: any; // Using any for flexibility or specific type if available
    discountedPrice?: Decimal | number;
}

export function ProductLabel({ product, discountedPrice }: ProductLabelProps) {
    const formatCurrency = useFormatCurrency();

    const price = new Decimal(product.price);
    const finalPrice = discountedPrice ? new Decimal(discountedPrice) : price;
    const hasDiscount = !price.equals(finalPrice);

    return (
        <div className="flex flex-col items-center justify-center border border-black p-2 w-[300px] h-[150px] bg-white text-black break-inside-avoid">
            <div className="w-full flex flex-row gap-2">
                <div className="w-full overflow-hidden mb-1 w-2/3">
                    <h3 className="font-bold text-sm truncate uppercase">{product.name}</h3>
                    {product.description && (
                        <p className="text-[10px] truncate text-gray-600 text-wrap">{product.description}</p>
                    )}
                </div>

                <div className="flex items-start gap-2 mb-1 w-1/3">
                    {hasDiscount && (
                        <span className="text-xl text-gray-500 line-through">
                            {formatCurrency(price)}
                        </span>
                    )}
                    <span className="font-bold text-xl">
                        {formatCurrency(finalPrice)}
                    </span>
                </div>
            </div>

            <div className="w-full flex justify-center max-w-full overflow-hidden">
                <Barcode
                    value={product.sku || "UNKNOWN"}
                    format="CODE128"
                    width={1.5}
                    height={40}
                    displayValue={true}
                    fontSize={12}
                    margin={0}
                    renderer="svg"
                />
            </div>
        </div>
    );
}
