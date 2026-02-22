"use client";

import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type TopCustomersProps = {
    data: {
        id: string;
        name: string;
        email: string;
        amount: number;
    }[];
};

export function TopCustomers({ data }: TopCustomersProps) {
    const formatCurrency = useFormatCurrency();

    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No customer data available
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {data.map((customer) => {
                const initials = customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                return (
                    <div key={customer.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {customer.email}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            {formatCurrency(customer.amount)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
