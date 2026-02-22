"use client";

import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type TopSuppliersProps = {
    data: {
        id: string;
        name: string;
        email: string;
        amount: number;
    }[];
};

export function TopSuppliers({ data }: TopSuppliersProps) {
    const formatCurrency = useFormatCurrency();

    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No supplier data available
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {data.map((supplier) => {
                const initials = supplier.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                return (
                    <div key={supplier.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {supplier.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {supplier.email}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            {formatCurrency(supplier.amount)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
